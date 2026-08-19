import { describe, expect, it } from "vitest";
import { calculateFinancialSummary, getPeriodWindow } from "./financial";

describe("calculateFinancialSummary", () => {
  it("calcula saldo, lucro bruto e lucro líquido a partir dos lançamentos", () => {
    const summary = calculateFinancialSummary([
      { entryType: "receita", amount: "15000.00" },
      { entryType: "custo_producao", amount: "6200.50" },
      { entryType: "despesa_administrativa", amount: "900.00" },
      { entryType: "imposto", amount: "640.25" },
      { entryType: "deducao", amount: "110.00" },
    ]);

    expect(summary).toMatchObject({
      totalRevenue: 15000,
      productionCosts: 6200.5,
      administrativeExpenses: 900,
      taxes: 640.25,
      deductions: 110,
      grossProfit: 8799.5,
      netProfit: 7149.25,
      cashBalance: 7149.25,
      entryCount: 5,
    });
  });

  it("ignora valores negativos e inválidos para proteger os indicadores", () => {
    const summary = calculateFinancialSummary([
      { entryType: "receita", amount: "500" },
      { entryType: "custo_producao", amount: -100 },
      { entryType: "imposto", amount: "indefinido" },
    ]);

    expect(summary.totalRevenue).toBe(500);
    expect(summary.productionCosts).toBe(0);
    expect(summary.netProfit).toBe(500);
  });
});

describe("getPeriodWindow", () => {
  it("encontra corretamente os limites de dia, mês, trimestre e ano", () => {
    expect(getPeriodWindow("dia", "2026-08-19")).toEqual({
      startDate: "2026-08-19",
      endDate: "2026-08-19",
    });
    expect(getPeriodWindow("mes", "2026-08-19")).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(getPeriodWindow("trimestre", "2026-08-19")).toEqual({
      startDate: "2026-07-01",
      endDate: "2026-09-30",
    });
    expect(getPeriodWindow("ano", "2026-08-19")).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
  });

  it("rejeita uma data de referência inválida", () => {
    expect(() => getPeriodWindow("mes", "data-inválida")).toThrow("data de referência");
  });
});
