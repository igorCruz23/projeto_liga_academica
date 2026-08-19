import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  createFinancialEntry: vi.fn(),
  createProperty: vi.fn(),
  getOwnedProperty: vi.fn(),
  getUserProfile: vi.fn(),
  listPropertiesByOwner: vi.fn(),
  listPropertyEntries: vi.fn(),
  saveUserProfile: vi.fn(),
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
    database.createProperty.mockResolvedValue({ id: 8, ownerId: 42, name: "Fazenda Aurora" });
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
      caller.finance.properties.create({ name: "Fazenda Aurora", municipality: "Patos de Minas", state: "MG" })
    ).resolves.toMatchObject({ id: 8, ownerId: 42 });
    await expect(
      caller.finance.entries.create({
        propertyId: 8,
        entryType: "receita",
        category: "Venda de animais",
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
});
