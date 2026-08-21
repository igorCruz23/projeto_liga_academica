import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  createFinancialEntry: vi.fn(),
  createPropertyWithUsers: vi.fn(),
  deactivateProperty: vi.fn(),
  deleteFinancialEntry: vi.fn(),
  getActivePropertyById: vi.fn(),
  getOwnedProperty: vi.fn(),
  getPropertyEntry: vi.fn(),
  getUserProfile: vi.fn(),
  listPropertiesByOwner: vi.fn(),
  listPropertyEntries: vi.fn(),
  saveUserProfile: vi.fn(),
  updateFinancialEntry: vi.fn(),
}));

vi.mock("./db", () => database);

import { appRouter } from "./routers";

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "user-42",
      name: "Gestor de Teste",
      email: "gestor@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("finance workflow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("executa o percurso de perfil, propriedade, lançamento e consulta mensal sem persistência real", async () => {
    database.saveUserProfile.mockResolvedValue({ userId: 42, profileRole: "gestor" });
    database.createPropertyWithUsers.mockResolvedValue({ id: 8, ownerId: 42, name: "Fazenda Aurora" });
    database.getOwnedProperty.mockResolvedValue({ id: 8, ownerId: 42, name: "Fazenda Aurora" });
    database.createFinancialEntry.mockResolvedValue({ id: 15, propertyId: 8, entryType: "receita" });
    database.listPropertyEntries.mockResolvedValue([
      { entryType: "receita", amount: "12500.00" },
      { entryType: "custo_producao", amount: "4200.00" },
      { entryType: "despesa_administrativa", amount: "600.00" },
    ]);

    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.profile.save({ profileRole: "gestor" })).resolves.toMatchObject({
      userId: 42,
      profileRole: "gestor",
    });
    await expect(
      caller.finance.properties.create({
        name: "Fazenda Aurora",
        municipality: "Patos de Minas",
        state: "MG",
        userCpfs: ["529.982.247-25"],
      })
    ).resolves.toMatchObject({ id: 8, ownerId: 42 });
    await expect(
      caller.finance.entries.create({
        propertyId: 8,
        entryType: "receita",
        category: "Venda de animais",
        activity: "Pecuária de corte",
        description: "Venda do lote de agosto",
        occurredOn: "2026-08-19",
        amount: 12500,
      })
    ).resolves.toMatchObject({ id: 15, propertyId: 8 });

    const result = await caller.finance.dashboard.summary({
      propertyId: 8,
      range: "mes",
      referenceDate: "2026-08-19",
    });

    expect(database.listPropertyEntries).toHaveBeenCalledWith(8, "2026-08-01", "2026-08-31");
    expect(result.summary).toMatchObject({
      totalRevenue: 12500,
      grossProfit: 8300,
      netProfit: 7700,
      cashBalance: 7700,
    });
  });

  it("bloqueia o painel quando a propriedade solicitada não pertence ao utilizador autenticado", async () => {
    database.getOwnedProperty.mockResolvedValue(null);
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(
      caller.finance.dashboard.summary({
        propertyId: 999,
        range: "mes",
        referenceDate: "2026-08-19",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(database.listPropertyEntries).not.toHaveBeenCalled();
  });

  it("inativa uma propriedade de gestor sem apagar o histórico financeiro", async () => {
    database.getUserProfile.mockResolvedValue({ userId: 42, profileRole: "gestor" });
    database.getOwnedProperty.mockResolvedValue({ id: 8, ownerId: 42, name: "Fazenda Aurora" });
    database.deactivateProperty.mockResolvedValue({ id: 8, isActive: false });
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.properties.deactivate({ propertyId: 8 })).resolves.toEqual({
      id: 8,
      isActive: false,
    });
    expect(database.deactivateProperty).toHaveBeenCalledWith(8);
    expect(database.listPropertyEntries).not.toHaveBeenCalled();
  });

  it("recusa a remoção quando o utilizador autenticado não possui perfil de gestor ou administrador", async () => {
    database.getUserProfile.mockResolvedValue({ userId: 42, profileRole: "produtor" });
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.properties.deactivate({ propertyId: 8 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(database.deactivateProperty).not.toHaveBeenCalled();
  });

  it("bloqueia um gestor quando a propriedade pertence a outro titular", async () => {
    database.getUserProfile.mockResolvedValue({ userId: 42, profileRole: "gestor" });
    database.getOwnedProperty.mockResolvedValue(null);
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.properties.deactivate({ propertyId: 91 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(database.deactivateProperty).not.toHaveBeenCalled();
  });

  it("edita e exclui lançamento apenas quando ele pertence à propriedade do utilizador", async () => {
    database.getOwnedProperty.mockResolvedValue({ id: 8, ownerId: 42, name: "Fazenda Aurora" });
    database.getPropertyEntry.mockResolvedValue({ id: 15, propertyId: 8, entryType: "receita" });
    database.updateFinancialEntry.mockResolvedValue({ id: 15, propertyId: 8, entryType: "custo_variavel" });
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.entries.update({
      propertyId: 8,
      entryId: 15,
      entryType: "custo_variavel",
      category: "Ração",
      activity: "Pecuária de corte",
      description: "Compra de suplemento",
      occurredOn: "2026-08-19",
      dueOn: "2026-08-25",
      settlementStatus: "pendente",
      amount: 850,
    })).resolves.toMatchObject({ id: 15, entryType: "custo_variavel" });

    expect(database.updateFinancialEntry).toHaveBeenCalledWith(15, expect.objectContaining({
      activity: "Pecuária de corte",
      settlementStatus: "pendente",
      amount: "850.00",
    }));

    await expect(caller.finance.entries.delete({ propertyId: 8, entryId: 15 })).resolves.toEqual({
      id: 15,
      deleted: true,
    });
    expect(database.deleteFinancialEntry).toHaveBeenCalledWith(15);
  });

  it("bloqueia edição e exclusão quando o lançamento não pertence à propriedade selecionada", async () => {
    database.getOwnedProperty.mockResolvedValue({ id: 8, ownerId: 42, name: "Fazenda Aurora" });
    database.getPropertyEntry.mockResolvedValue(null);
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.entries.delete({ propertyId: 8, entryId: 99 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(database.deleteFinancialEntry).not.toHaveBeenCalled();
  });

});
