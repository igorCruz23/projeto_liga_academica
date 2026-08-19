import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { ensurePropertyOwnership } from "./routers/finance";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("finance authorization", () => {
  it("impede uma sessão não autenticada de listar propriedades", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(caller.finance.properties.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("impede uma sessão não autenticada de consultar o fluxo de caixa", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(
      caller.finance.dashboard.summary({
        propertyId: 1,
        range: "mes",
        referenceDate: "2026-08-19",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("bloqueia explicitamente a leitura de uma propriedade sem titularidade", () => {
    let capturedError: unknown;
    try {
      ensurePropertyOwnership(null);
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite continuar quando a propriedade pertence ao utilizador autenticado", () => {
    expect(ensurePropertyOwnership({ id: 7, name: "Fazenda Horizonte" })).toEqual({
      id: 7,
      name: "Fazenda Horizonte",
    });
  });
});
