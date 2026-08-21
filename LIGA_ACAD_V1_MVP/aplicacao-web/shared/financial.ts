export const financialEntryTypes = [
  "receita",
  "custo_producao",
  "custo_fixo",
  "custo_variavel",
  "despesa_administrativa",
  "imposto",
  "deducao",
] as const;

export const financialSettlementStatuses = ["liquidado", "pendente"] as const;
export const financialDisplayStatuses = ["recebido", "pago", "pendente", "vencido"] as const;

export type FinancialEntryType = (typeof financialEntryTypes)[number];
export type FinancialSettlementStatus = (typeof financialSettlementStatuses)[number];
export type FinancialDisplayStatus = (typeof financialDisplayStatuses)[number];
export type PeriodRange = "dia" | "mes" | "trimestre" | "ano";

export type FinancialEntryForCalculation = {
  amount: string | number;
  entryType: FinancialEntryType;
  activity?: string | null;
  settlementStatus?: FinancialSettlementStatus;
  dueOn?: Date | string | null;
};

export type FinancialSummary = {
  totalRevenue: number;
  fixedCosts: number;
  variableCosts: number;
  productionCosts: number;
  totalCosts: number;
  administrativeExpenses: number;
  taxes: number;
  deductions: number;
  settledRevenue: number;
  settledOutflows: number;
  pendingAmount: number;
  overdueAmount: number;
  cashBalance: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number | null;
  netMargin: number | null;
  contributionMargin: number;
  contributionMarginRate: number | null;
  breakEvenPoint: number | null;
  entryCount: number;
};

export type FinancialComparison = {
  current: FinancialSummary;
  previous: FinancialSummary;
  change: Record<"totalRevenue" | "totalCosts" | "grossProfit" | "netProfit", {
    absolute: number;
    percentage: number | null;
  }>;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDate(value: Date | string) {
  if (value instanceof Date) return value;
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isRevenueEntry(entryType: FinancialEntryType) {
  return entryType === "receita";
}

export function isCostEntry(entryType: FinancialEntryType) {
  return entryType === "custo_producao" || entryType === "custo_fixo" || entryType === "custo_variavel";
}

export function getFinancialDisplayStatus(
  entry: Pick<FinancialEntryForCalculation, "entryType" | "settlementStatus" | "dueOn">,
  today = new Date()
): FinancialDisplayStatus {
  if (entry.settlementStatus !== "pendente") {
    return isRevenueEntry(entry.entryType) ? "recebido" : "pago";
  }

  if (entry.dueOn) {
    const dueOn = toDate(entry.dueOn);
    const comparisonDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (dueOn.getTime() < comparisonDate.getTime()) return "vencido";
  }

  return "pendente";
}

export function calculateFinancialSummary(
  entries: FinancialEntryForCalculation[],
  today = new Date()
): FinancialSummary {
  const totals = entries.reduce(
    (accumulator, entry) => {
      const amount = Number(entry.amount);
      if (!Number.isFinite(amount) || amount < 0) return accumulator;

      const isRevenue = isRevenueEntry(entry.entryType);
      const isSettled = entry.settlementStatus !== "pendente";

      if (isRevenue) accumulator.totalRevenue += amount;
      if (entry.entryType === "custo_fixo") accumulator.fixedCosts += amount;
      if (entry.entryType === "custo_variavel" || entry.entryType === "custo_producao") {
        accumulator.variableCosts += amount;
      }
      if (entry.entryType === "custo_producao") accumulator.productionCosts += amount;
      if (entry.entryType === "despesa_administrativa") accumulator.administrativeExpenses += amount;
      if (entry.entryType === "imposto") accumulator.taxes += amount;
      if (entry.entryType === "deducao") accumulator.deductions += amount;

      if (isSettled && isRevenue) accumulator.settledRevenue += amount;
      if (isSettled && !isRevenue) accumulator.settledOutflows += amount;
      if (!isSettled) {
        accumulator.pendingAmount += amount;
        if (getFinancialDisplayStatus(entry, today) === "vencido") accumulator.overdueAmount += amount;
      }
      return accumulator;
    },
    {
      totalRevenue: 0,
      fixedCosts: 0,
      variableCosts: 0,
      productionCosts: 0,
      administrativeExpenses: 0,
      taxes: 0,
      deductions: 0,
      settledRevenue: 0,
      settledOutflows: 0,
      pendingAmount: 0,
      overdueAmount: 0,
    }
  );

  const totalCosts = totals.fixedCosts + totals.variableCosts;
  const grossProfit = totals.totalRevenue - totalCosts;
  const netProfit = grossProfit - totals.administrativeExpenses - totals.taxes - totals.deductions;
  const contributionMargin = totals.totalRevenue - totals.variableCosts;
  const grossMargin = totals.totalRevenue > 0 ? roundPercentage((grossProfit / totals.totalRevenue) * 100) : null;
  const netMargin = totals.totalRevenue > 0 ? roundPercentage((netProfit / totals.totalRevenue) * 100) : null;
  const contributionMarginRate = totals.totalRevenue > 0
    ? roundPercentage((contributionMargin / totals.totalRevenue) * 100)
    : null;
  const breakEvenPoint = contributionMarginRate && contributionMarginRate > 0
    ? roundCurrency(totals.fixedCosts / (contributionMarginRate / 100))
    : null;

  return {
    ...Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, roundCurrency(value)])
    ),
    totalCosts: roundCurrency(totalCosts),
    cashBalance: roundCurrency(totals.settledRevenue - totals.settledOutflows),
    grossProfit: roundCurrency(grossProfit),
    netProfit: roundCurrency(netProfit),
    grossMargin,
    netMargin,
    contributionMargin: roundCurrency(contributionMargin),
    contributionMarginRate,
    breakEvenPoint,
    entryCount: entries.length,
  } as FinancialSummary;
}

export function calculateFinancialComparison(
  currentEntries: FinancialEntryForCalculation[],
  previousEntries: FinancialEntryForCalculation[],
  today = new Date()
): FinancialComparison {
  const current = calculateFinancialSummary(currentEntries, today);
  const previous = calculateFinancialSummary(previousEntries, today);
  const keys = ["totalRevenue", "totalCosts", "grossProfit", "netProfit"] as const;

  const change = Object.fromEntries(keys.map(key => {
    const absolute = roundCurrency(current[key] - previous[key]);
    const percentage = previous[key] === 0 ? null : roundPercentage((absolute / Math.abs(previous[key])) * 100);
    return [key, { absolute, percentage }];
  })) as FinancialComparison["change"];

  return { current, previous, change };
}

export function calculateActivitySummaries(entries: FinancialEntryForCalculation[], today = new Date()) {
  const byActivity = new Map<string, FinancialEntryForCalculation[]>();
  entries.forEach(entry => {
    const activity = entry.activity?.trim() || "Não informada";
    const current = byActivity.get(activity) ?? [];
    current.push(entry);
    byActivity.set(activity, current);
  });

  return Array.from(byActivity.entries())
    .map(([activity, activityEntries]) => ({
      activity,
      summary: calculateFinancialSummary(activityEntries, today),
    }))
    .sort((left, right) => right.summary.totalRevenue - left.summary.totalRevenue);
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

export function getPreviousPeriodWindow(range: PeriodRange, referenceDate: string) {
  const current = new Date(`${referenceDate}T12:00:00.000Z`);
  if (Number.isNaN(current.getTime())) throw new Error("A data de referência é inválida.");

  if (range === "dia") {
    current.setUTCDate(current.getUTCDate() - 1);
    return getPeriodWindow(range, toIsoDate(current));
  }

  if (range === "mes") {
    return getPeriodWindow(range, toIsoDate(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1))));
  }

  if (range === "trimestre") {
    const quarterStartMonth = Math.floor(current.getUTCMonth() / 3) * 3;
    return getPeriodWindow(range, toIsoDate(new Date(Date.UTC(current.getUTCFullYear(), quarterStartMonth - 3, 1))));
  }

  return getPeriodWindow(range, `${current.getUTCFullYear() - 1}-01-01`);
}
