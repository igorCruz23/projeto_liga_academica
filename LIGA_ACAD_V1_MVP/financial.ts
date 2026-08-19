export const financialEntryTypes = [
  "receita",
  "custo_producao",
  "despesa_administrativa",
  "imposto",
  "deducao",
] as const;

export type FinancialEntryType = (typeof financialEntryTypes)[number];
export type PeriodRange = "dia" | "mes" | "trimestre" | "ano";

export type FinancialEntryForCalculation = {
  amount: string | number;
  entryType: FinancialEntryType;
};

export type FinancialSummary = {
  totalRevenue: number;
  productionCosts: number;
  administrativeExpenses: number;
  taxes: number;
  deductions: number;
  cashBalance: number;
  grossProfit: number;
  netProfit: number;
  entryCount: number;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateFinancialSummary(
  entries: FinancialEntryForCalculation[]
): FinancialSummary {
  const totals = entries.reduce(
    (accumulator, entry) => {
      const amount = Number(entry.amount);
      if (!Number.isFinite(amount) || amount < 0) return accumulator;

      if (entry.entryType === "receita") accumulator.totalRevenue += amount;
      if (entry.entryType === "custo_producao") accumulator.productionCosts += amount;
      if (entry.entryType === "despesa_administrativa") {
        accumulator.administrativeExpenses += amount;
      }
      if (entry.entryType === "imposto") accumulator.taxes += amount;
      if (entry.entryType === "deducao") accumulator.deductions += amount;
      return accumulator;
    },
    {
      totalRevenue: 0,
      productionCosts: 0,
      administrativeExpenses: 0,
      taxes: 0,
      deductions: 0,
    }
  );

  const grossProfit = totals.totalRevenue - totals.productionCosts;
  const netProfit =
    totals.totalRevenue -
    totals.productionCosts -
    totals.administrativeExpenses -
    totals.taxes -
    totals.deductions;

  return {
    ...Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, roundCurrency(value)])
    ),
    cashBalance: roundCurrency(netProfit),
    grossProfit: roundCurrency(grossProfit),
    netProfit: roundCurrency(netProfit),
    entryCount: entries.length,
  } as FinancialSummary;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getPeriodWindow(range: PeriodRange, referenceDate: string) {
  const parsedDate = new Date(`${referenceDate}T12:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("A data de referência é inválida.");
  }

  const year = parsedDate.getUTCFullYear();
  const month = parsedDate.getUTCMonth();

  if (range === "dia") {
    return { startDate: referenceDate, endDate: referenceDate };
  }

  if (range === "mes") {
    return {
      startDate: toIsoDate(new Date(Date.UTC(year, month, 1))),
      endDate: toIsoDate(new Date(Date.UTC(year, month + 1, 0))),
    };
  }

  if (range === "trimestre") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      startDate: toIsoDate(new Date(Date.UTC(year, quarterStartMonth, 1))),
      endDate: toIsoDate(new Date(Date.UTC(year, quarterStartMonth + 3, 0))),
    };
  }

  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}
