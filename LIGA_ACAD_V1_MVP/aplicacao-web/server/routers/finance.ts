import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addUsersToProperty,
  createDomainUser,
  createFinancialEntry,
  createPropertyWithUsers,
  deactivateProperty,
  deleteFinancialEntry,
  getActivePropertyById,
  getOwnedProperty,
  getPropertyEntry,
  getUserProfile,
  listDomainUsersByCreator,
  listPropertiesByOwner,
  listPropertyDomainUsers,
  listPropertyEntries,
  saveUserProfile,
  updateFinancialEntry,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  calculateActivitySummaries,
  calculateFinancialComparison,
  calculateFinancialSummary,
  financialDisplayStatuses,
  financialEntryTypes,
  financialSettlementStatuses,
  getFinancialDisplayStatus,
  getPeriodWindow,
  getPreviousPeriodWindow,
} from "../../shared/financial";

const profileRoles = ["produtor", "gestor", "estudante", "consultor", "administrador"] as const;
const periodRanges = ["dia", "mes", "trimestre", "ano"] as const;
const propertyRemovalRoles = ["gestor", "administrador"] as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function normalizeCpf(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calculateDigit = (length: number) => {
    const sum = cpf.slice(0, length).split("").reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

const cpfInput = z.string().trim().min(11).max(18).transform(normalizeCpf).refine(isValidCpf, "CPF inválido.");
const domainUserSexes = ["feminino", "masculino", "outro", "nao_informar"] as const;

const propertyInput = z.object({
  name: z.string().trim().min(3).max(140),
  municipality: z.string().trim().max(100).optional(),
  state: z.string().trim().toUpperCase().length(2).optional(),
  totalArea: z.coerce.number().positive().max(99999999).optional(),
  mainActivity: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1200).optional(),
  userCpfs: z.array(cpfInput).min(1, "Selecione pelo menos um proprietário.").max(25).transform(values => Array.from(new Set(values))),
});

const entryFiltersInput = z.object({
  activity: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  settlementStatus: z.enum(financialDisplayStatuses).optional(),
});

const dateRangeInput = z.object({
  propertyId: z.number().int().positive(),
  range: z.enum(periodRanges),
  referenceDate: isoDate,
}).merge(entryFiltersInput);

const entryDetailsInput = z.object({
  entryType: z.enum(financialEntryTypes),
  category: z.string().trim().min(2).max(100),
  activity: z.string().trim().min(2).max(120),
  description: z.string().trim().min(3).max(1200),
  occurredOn: isoDate,
  dueOn: isoDate.optional(),
  settlementStatus: z.enum(financialSettlementStatuses).default("liquidado"),
  amount: z.coerce.number().positive().max(999999999),
});

const entryCreateInput = entryDetailsInput.extend({ propertyId: z.number().int().positive() });
const entryUpdateInput = entryDetailsInput.extend({
  propertyId: z.number().int().positive(),
  entryId: z.number().int().positive(),
});

export function ensurePropertyOwnership<T extends { id: number }>(property: T | null) {
  if (!property) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Não tem acesso a esta propriedade.",
    });
  }
  return property;
}

export function canDeactivateProperty(
  profileRole: string | null | undefined,
  accountRole: "user" | "admin"
) {
  return accountRole === "admin" || propertyRemovalRoles.includes(
    profileRole as (typeof propertyRemovalRoles)[number]
  );
}

async function assertPropertyOwnership(propertyId: number, ownerId: number) {
  const property = await getOwnedProperty(propertyId, ownerId);
  return ensurePropertyOwnership(property);
}

async function assertEntryOwnership(entryId: number, propertyId: number, ownerId: number) {
  await assertPropertyOwnership(propertyId, ownerId);
  return ensurePropertyOwnership(await getPropertyEntry(entryId, propertyId));
}

async function assertPropertyRemovalPermission(
  propertyId: number,
  userId: number,
  accountRole: "user" | "admin"
) {
  const profile = await getUserProfile(userId);
  if (!canDeactivateProperty(profile?.profileRole, accountRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas gestores e administradores podem remover propriedades.",
    });
  }

  if (accountRole === "admin") {
    return ensurePropertyOwnership(await getActivePropertyById(propertyId));
  }

  return assertPropertyOwnership(propertyId, userId);
}

function applyEntryFilters<
  T extends {
    activity: string;
    category: string;
    entryType: (typeof financialEntryTypes)[number];
    settlementStatus: (typeof financialSettlementStatuses)[number];
    dueOn: Date | null;
  }
>(entries: T[], filters: z.infer<typeof entryFiltersInput>) {
  return entries
    .map(entry => ({ ...entry, displayStatus: getFinancialDisplayStatus(entry) }))
    .filter(entry => {
      if (filters.activity && entry.activity !== filters.activity) return false;
      if (filters.category && entry.category !== filters.category) return false;
      if (filters.settlementStatus && entry.displayStatus !== filters.settlementStatus) return false;
      return true;
    });
}

function entryValues(input: z.infer<typeof entryDetailsInput>) {
  const occurredOn = new Date(`${input.occurredOn}T12:00:00.000Z`);
  return {
    entryType: input.entryType,
    category: input.category,
    activity: input.activity,
    description: input.description,
    occurredOn,
    dueOn: input.dueOn ? new Date(`${input.dueOn}T12:00:00.000Z`) : null,
    settlementStatus: input.settlementStatus,
    settledOn: input.settlementStatus === "liquidado" ? occurredOn : null,
    amount: input.amount.toFixed(2),
  };
}

export const financeRouter = router({
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getUserProfile(ctx.user.id)),
    save: protectedProcedure
      .input(z.object({ profileRole: z.enum(profileRoles) }))
      .mutation(({ ctx, input }) => saveUserProfile(ctx.user.id, input.profileRole)),
  }),
  domainUsers: router({
    list: protectedProcedure.query(({ ctx }) => listDomainUsersByCreator(ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        cpf: cpfInput,
        name: z.string().trim().min(3).max(160),
        sex: z.enum(domainUserSexes).default("nao_informar"),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createDomainUser({
            cpf: input.cpf,
            name: input.name,
            sex: input.sex,
            createdById: ctx.user.id,
          });
        } catch (error: any) {
          if (error?.code === "ER_DUP_ENTRY") {
            throw new TRPCError({ code: "CONFLICT", message: "Já existe um utilizador com este CPF nesta conta." });
          }
          throw error;
        }
      }),
  }),
  properties: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const properties = await listPropertiesByOwner(ctx.user.id);
      return Promise.all(properties.map(async property => ({
        ...property,
        domainUsers: await listPropertyDomainUsers(property.id),
      })));
    }),
    create: protectedProcedure.input(propertyInput).mutation(async ({ ctx, input }) => {
      try {
        return await createPropertyWithUsers(ctx.user.id, {
          name: input.name,
          municipality: input.municipality || null,
          state: input.state || null,
          totalArea: input.totalArea ? input.totalArea.toFixed(2) : null,
          mainActivity: input.mainActivity || null,
          description: input.description || null,
          isActive: true,
        }, input.userCpfs);
      } catch (error: any) {
        if (error?.message?.includes("utilizadores selecionados")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        throw error;
      }
    }),
    users: protectedProcedure.input(z.object({ propertyId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertPropertyOwnership(input.propertyId, ctx.user.id);
      return listPropertyDomainUsers(input.propertyId);
    }),
    linkUsers: protectedProcedure.input(z.object({
      propertyId: z.number().int().positive(),
      userCpfs: z.array(cpfInput).min(1).max(25).transform(values => Array.from(new Set(values))),
    })).mutation(async ({ ctx, input }) => {
      await assertPropertyOwnership(input.propertyId, ctx.user.id);
      try {
        return await addUsersToProperty(input.propertyId, ctx.user.id, input.userCpfs);
      } catch (error: any) {
        if (error?.message?.includes("utilizadores selecionados")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        throw error;
      }
    }),
    deactivate: protectedProcedure
      .input(z.object({ propertyId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const property = await assertPropertyRemovalPermission(
          input.propertyId,
          ctx.user.id,
          ctx.user.role
        );
        await deactivateProperty(property.id);
        return { id: property.id, isActive: false };
      }),
  }),
  entries: router({
    list: protectedProcedure.input(dateRangeInput).query(async ({ ctx, input }) => {
      await assertPropertyOwnership(input.propertyId, ctx.user.id);
      const period = getPeriodWindow(input.range, input.referenceDate);
      const entries = await listPropertyEntries(input.propertyId, period.startDate, period.endDate);
      const filteredEntries = applyEntryFilters(entries, input);
      return {
        entries: filteredEntries,
        period,
        activities: Array.from(new Set(entries.map(entry => entry.activity))).sort(),
        categories: Array.from(new Set(entries.map(entry => entry.category))).sort(),
      };
    }),
    create: protectedProcedure.input(entryCreateInput).mutation(async ({ ctx, input }) => {
      await assertPropertyOwnership(input.propertyId, ctx.user.id);
      return createFinancialEntry({
        propertyId: input.propertyId,
        createdById: ctx.user.id,
        ...entryValues(input),
      });
    }),
    update: protectedProcedure.input(entryUpdateInput).mutation(async ({ ctx, input }) => {
      await assertEntryOwnership(input.entryId, input.propertyId, ctx.user.id);
      return updateFinancialEntry(input.entryId, entryValues(input));
    }),
    delete: protectedProcedure
      .input(z.object({ propertyId: z.number().int().positive(), entryId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await assertEntryOwnership(input.entryId, input.propertyId, ctx.user.id);
        await deleteFinancialEntry(input.entryId);
        return { id: input.entryId, deleted: true };
      }),
  }),
  dashboard: router({
    summary: protectedProcedure.input(dateRangeInput).query(async ({ ctx, input }) => {
      await assertPropertyOwnership(input.propertyId, ctx.user.id);
      const period = getPeriodWindow(input.range, input.referenceDate);
      const previousPeriod = getPreviousPeriodWindow(input.range, input.referenceDate);
      const [entries, previousEntries] = await Promise.all([
        listPropertyEntries(input.propertyId, period.startDate, period.endDate),
        listPropertyEntries(input.propertyId, previousPeriod.startDate, previousPeriod.endDate),
      ]);
      const filteredEntries = applyEntryFilters(entries, input);
      const filteredPreviousEntries = applyEntryFilters(previousEntries, input);
      return {
        period,
        previousPeriod,
        summary: calculateFinancialSummary(filteredEntries),
        comparison: calculateFinancialComparison(filteredEntries, filteredPreviousEntries),
        activitySummaries: calculateActivitySummaries(filteredEntries),
      };
    }),
  }),
});
