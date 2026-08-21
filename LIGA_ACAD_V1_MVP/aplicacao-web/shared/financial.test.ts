import { describe, expect, it } from "vitest";
import {
  calculateActivitySummaries,
  calculateFinancialComparison,
  calculateFinancialSummary,
  getFinancialDisplayStatus,
  getPeriodWindow,
  getPreviousPeriodWindow,
} from "./financial";

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

  it("calcula custos fixos e variáveis, margens e ponto de equilíbrio", () => {
    const summary = calculateFinancialSummary([
      { entryType: "receita", amount: 20000 },
      { entryType: "custo_fixo", amount: 4000 },
      { entryType: "custo_variavel", amount: 6000 },
      { entryType: "despesa_administrativa", amount: 1000 },
    ]);

    expect(summary).toMatchObject({
      fixedCosts: 4000,
      variableCosts: 6000,
      totalCosts: 10000,
      grossProfit: 10000,
      netProfit: 9000,
      grossMargin: 50,
      netMargin: 45,
      contributionMargin: 14000,
      contributionMarginRate: 70,
      breakEvenPoint: 5714.29,
    });
  });

  it("separa caixa liquidado de pendências e identifica vencimentos", () => {
    const today = new Date("2026-08-20T12:00:00.000Z");
    const summary = calculateFinancialSummary([
      { entryType: "receita", amount: 1000, settlementStatus: "liquidado" },
      { entryType: "custo_fixo", amount: 200, settlementStatus: "liquidado" },
      { entryType: "receita", amount: 500, settlementStatus: "pendente", dueOn: "2026-08-19" },
      { entryType: "custo_variavel", amount: 100, settlementStatus: "pendente", dueOn: "2026-08-25" },
    ], today);

    expect(summary.cashBalance).toBe(800);
    expect(summary.pendingAmount).toBe(600);
    expect(summary.overdueAmount).toBe(500);
    expect(getFinancialDisplayStatus({ entryType: "receita", settlementStatus: "pendente", dueOn: "2026-08-19" }, today)).toBe("vencido");
    expect(getFinancialDisplayStatus({ entryType: "custo_fixo", settlementStatus: "liquidado" }, today)).toBe("pago");
  });

  it("calcula comparação temporal e agrupa resultados por atividade", () => {
    const current = [
      { entryType: "receita" as const, amount: 1000, activity: "Leite" },
      { entryType: "custo_variavel" as const, amount: 300, activity: "Leite" },
      { entryType: "receita" as const, amount: 500, activity: "Milho" },
    ];
    const previous = [{ entryType: "receita" as const, amount: 1000, activity: "Leite" }];
    const comparison = calculateFinancialComparison(current, previous);
    const activities = calculateActivitySummaries(current);

    expect(comparison.change.totalRevenue).toEqual({ absolute: 500, percentage: 50 });
    expect(activities).toHaveLength(2);
    expect(activities.find(item => item.activity === "Leite")?.summary.netProfit).toBe(700);
    expect(activities.find(item => item.activity === "Milho")?.summary.totalRevenue).toBe(500);
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

  it("encontra a janela imediatamente anterior equivalente", () => {
    expect(getPreviousPeriodWindow("dia", "2026-01-01")).toEqual({ startDate: "2025-12-31", endDate: "2025-12-31" });
    expect(getPreviousPeriodWindow("mes", "2026-01-15")).toEqual({ startDate: "2025-12-01", endDate: "2025-12-31" });
    expect(getPreviousPeriodWindow("trimestre", "2026-02-10")).toEqual({ startDate: "2025-10-01", endDate: "2025-12-31" });
    expect(getPreviousPeriodWindow("ano", "2026-08-19")).toEqual({ startDate: "2025-01-01", endDate: "2025-12-31" });
  });
});
