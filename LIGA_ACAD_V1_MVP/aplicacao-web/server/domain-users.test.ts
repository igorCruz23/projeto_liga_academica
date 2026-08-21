import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  addUsersToProperty: vi.fn(),
  createDomainUser: vi.fn(),
  createPropertyWithUsers: vi.fn(),
  getOwnedProperty: vi.fn(),
  listDomainUsersByCreator: vi.fn(),
}));

vi.mock("./db", () => database);

import { appRouter } from "./routers";
import { isValidCpf, normalizeCpf } from "./routers/finance";

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "owner-42",
      name: "Conta de teste",
      email: "owner@example.com",
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

describe("utilizadores de domínio e propriedades", () => {
  beforeEach(() => vi.resetAllMocks());

  it("normaliza e valida CPF pelo algoritmo de dígitos verificadores", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("cria utilizador de domínio com CPF normalizado e titular técnico da conta", async () => {
    database.createDomainUser.mockResolvedValue({ cpf: "52998224725", name: "Maria da Silva" });
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.domainUsers.create({
      cpf: "529.982.247-25",
      name: "Maria da Silva",
      sex: "feminino",
    })).resolves.toMatchObject({ cpf: "52998224725", name: "Maria da Silva" });

    expect(database.createDomainUser).toHaveBeenCalledWith({
      cpf: "52998224725",
      name: "Maria da Silva",
      sex: "feminino",
      createdById: 42,
    });
  });

  it("exige ao menos um utilizador válido para criar propriedade", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.properties.create({
      name: "Fazenda Aurora",
      userCpfs: [],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(database.createPropertyWithUsers).not.toHaveBeenCalled();
  });

  it("cria propriedade e vínculo inicial para múltiplos utilizadores", async () => {
    database.createPropertyWithUsers.mockResolvedValue({ id: 8, name: "Fazenda Aurora" });
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.properties.create({
      name: "Fazenda Aurora",
      userCpfs: ["529.982.247-25", "111.444.777-35"],
    })).resolves.toMatchObject({ id: 8, name: "Fazenda Aurora" });

    expect(database.createPropertyWithUsers).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ name: "Fazenda Aurora", isActive: true }),
      ["52998224725", "11144477735"]
    );
  });

  it("vincula coproprietários apenas a uma propriedade da conta autenticada", async () => {
    database.getOwnedProperty.mockResolvedValue({ id: 8, ownerId: 42, name: "Fazenda Aurora" });
    database.addUsersToProperty.mockResolvedValue([{ cpf: "11144477735", name: "João Silva" }]);
    const caller = appRouter.createCaller(createAuthenticatedContext());

    await expect(caller.finance.properties.linkUsers({
      propertyId: 8,
      userCpfs: ["111.444.777-35"],
    })).resolves.toEqual([{ cpf: "11144477735", name: "João Silva" }]);
    expect(database.addUsersToProperty).toHaveBeenCalledWith(8, 42, ["11144477735"]);
  });
});
