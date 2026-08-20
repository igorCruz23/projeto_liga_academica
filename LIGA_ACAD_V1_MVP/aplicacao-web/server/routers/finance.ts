import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createFinancialEntry,
  createProperty,
  deactivateProperty,
  getActivePropertyById,
  getOwnedProperty,
  getUserProfile,
  listPropertiesByOwner,
  listPropertyEntries,
  saveUserProfile,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  calculateFinancialSummary,
  financialEntryTypes,
  getPeriodWindow,
} from "../../shared/financial";

const profileRoles = ["produtor", "gestor", "estudante", "consultor", "administrador"] as const;
const periodRanges = ["dia", "mes", "trimestre", "ano"] as const;
const propertyRemovalRoles = ["gestor", "administrador"] as const;

const propertyInput = z.object({
  name: z.string().trim().min(3).max(140),
  municipality: z.string().trim().max(100).optional(),
  state: z.string().trim().toUpperCase().length(2).optional(),
  totalArea: z.coerce.number().positive().max(99999999).optional(),
  mainActivity: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1200).optional(),
});

const dateRangeInput = z.object({
  propertyId: z.number().int().positive(),
  range: z.enum(periodRanges),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

export const financeRouter = router({
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getUserProfile(ctx.user.id)),
    save: protectedProcedure
      .input(z.object({ profileRole: z.enum(profileRoles) }))
      .mutation(({ ctx, input }) => saveUserProfile(ctx.user.id, input.profileRole)),
  }),
  properties: router({
    list: protectedProcedure.query(({ ctx }) => listPropertiesByOwner(ctx.user.id)),
    create: protectedProcedure.input(propertyInput).mutation(({ ctx, input }) =>
      createProperty(ctx.user.id, {
        name: input.name,
        municipality: input.municipality || null,
        state: input.state || null,
        totalArea: input.totalArea ? input.totalArea.toFixed(2) : null,
        mainActivity: input.mainActivity || null,
        description: input.description || null,
        isActive: true,
      })
    ),
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
      const entries = await listPropertyEntries(
        input.propertyId,
        period.startDate,
        period.endDate
      );
      return { entries, period };
    }),
    create: protectedProcedure
      .input(
        z.object({
          propertyId: z.number().int().positive(),
          entryType: z.enum(financialEntryTypes),
          category: z.string().trim().min(2).max(100),
          description: z.string().trim().min(3).max(1200),
          occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          amount: z.coerce.number().positive().max(999999999),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertPropertyOwnership(input.propertyId, ctx.user.id);
        return createFinancialEntry({
          propertyId: input.propertyId,
          createdById: ctx.user.id,
          entryType: input.entryType,
          category: input.category,
          description: input.description,
          occurredOn: new Date(`${input.occurredOn}T12:00:00.000Z`),
          amount: input.amount.toFixed(2),
        });
      }),
  }),
  dashboard: router({
    summary: protectedProcedure.input(dateRangeInput).query(async ({ ctx, input }) => {
      await assertPropertyOwnership(input.propertyId, ctx.user.id);
      const period = getPeriodWindow(input.range, input.referenceDate);
      const entries = await listPropertyEntries(
        input.propertyId,
        period.startDate,
        period.endDate
      );
      return {
        period,
        summary: calculateFinancialSummary(entries),
      };
    }),
  }),
});
