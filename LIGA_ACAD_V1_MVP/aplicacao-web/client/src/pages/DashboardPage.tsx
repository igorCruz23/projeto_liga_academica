import { EmptyState } from "@/components/EmptyState";
import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { PropertySelector } from "@/components/PropertySelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelectedProperty } from "@/hooks/useSelectedProperty";
import { formatCurrency, formatPeriod } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarDays, CircleDollarSign, Landmark, ReceiptText, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const ranges = [
  { value: "dia", label: "Hoje" },
  { value: "mes", label: "Este mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
] as const;

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("mes");
  const [referenceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { propertyId, setPropertyId } = useSelectedProperty();
  const propertiesQuery = trpc.finance.properties.list.useQuery();
  const profileQuery = trpc.finance.profile.get.useQuery();
  const summaryQuery = trpc.finance.dashboard.summary.useQuery(
    { propertyId: propertyId ?? 0, range, referenceDate },
    { enabled: Boolean(propertyId) }
  );
  const summary = summaryQuery.data?.summary;
  const period = summaryQuery.data?.period;
  const property = propertiesQuery.data?.find(item => item.id === propertyId);

  if (propertiesQuery.isLoading || profileQuery.isLoading) {
    return <LoadingState title="A carregar o seu panorama financeiro" />;
  }

  if (propertiesQuery.isError || profileQuery.isError || summaryQuery.isError) {
    return <QueryErrorState onRetry={() => { void propertiesQuery.refetch(); void profileQuery.refetch(); void summaryQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-7 sm:space-y-9">
      <PageHeader
        eyebrow="Inteligência financeira"
        title="A operação em foco."
        description="Leia os principais resultados da sua propriedade com contexto, período e fórmula claros."
        action={<PropertySelector properties={propertiesQuery.data} value={propertyId} onChange={setPropertyId} disabled={propertiesQuery.isLoading} />}
      />

      {profileQuery.data === null ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-orange-200/15 bg-orange-300/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-orange-100">Defina o seu perfil para concluir a configuração.</p>
            <p className="mt-1 text-sm text-orange-100/70">Isso ajuda a contextualizar o uso da plataforma, sem alterar os dados financeiros.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/perfil")} className="border-orange-200/20 bg-transparent text-orange-100 hover:bg-orange-300/10 hover:text-white">Definir perfil <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      ) : null}

      {!propertiesQuery.isLoading && !propertiesQuery.data?.length ? (
        <EmptyState
          icon={Landmark}
          title="A sua primeira propriedade começa aqui"
          description="Cadastre uma propriedade rural para centralizar receitas, custos e resultados em um único lugar."
          action={<Button onClick={() => setLocation("/propriedades")} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">Cadastrar propriedade <ArrowRight className="ml-2 h-4 w-4" /></Button>}
        />
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_20px_45px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><CalendarDays className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Janela analisada</p>
                <p className="mt-1 text-sm font-semibold text-white">{period ? formatPeriod(period.startDate, period.endDate) : "A preparar resultados"}</p>
              </div>
            </div>
            <Select value={range} onValueChange={value => setRange(value as typeof range)}>
              <SelectTrigger className="h-10 w-full border-white/10 bg-[#081d20]/70 text-white sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent className="border-white/10 bg-[#0b2024] text-slate-100">
                {ranges.map(item => <SelectItem key={item.value} value={item.value} className="focus:bg-white/10 focus:text-white">{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <MetricCard label="Saldo de caixa" value={formatCurrency(summary?.cashBalance)} description="Receitas menos todas as saídas registradas." icon={CircleDollarSign} accent="cyan" />
            <MetricCard label="Lucro bruto" value={formatCurrency(summary?.grossProfit)} description="Receitas menos custos de produção." icon={TrendingUp} accent="orange" />
            <MetricCard label="Lucro líquido" value={formatCurrency(summary?.netProfit)} description="Resultado após custos, despesas, impostos e deduções." icon={ReceiptText} accent="lime" />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-2xl border border-white/10 bg-[#0a2023]/70 p-6 shadow-[0_22px_50px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cyan-300">Leitura do período</p>
                  <h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-white">Composição do resultado</h2>
                </div>
                <Badge className="border border-white/10 bg-white/[0.05] font-semibold text-slate-300 hover:bg-white/[0.05]">{summary?.entryCount ?? 0} lançamentos</Badge>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <ResultLine label="Receitas registradas" value={formatCurrency(summary?.totalRevenue)} positive />
                <ResultLine label="Custos de produção" value={formatCurrency(summary?.productionCosts)} />
                <ResultLine label="Despesas administrativas" value={formatCurrency(summary?.administrativeExpenses)} />
                <ResultLine label="Impostos e deduções" value={formatCurrency((summary?.taxes ?? 0) + (summary?.deductions ?? 0))} />
              </div>
              <div className="mt-6 flex flex-col gap-4 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-lg text-sm leading-6 text-slate-300">O lucro líquido e o saldo do fluxo de caixa usam a mesma base neste M.V.P.: receitas menos custos, despesas administrativas, impostos e deduções.</p>
                <Button onClick={() => setLocation("/fluxo-de-caixa")} variant="outline" className="shrink-0 border-cyan-200/15 bg-transparent text-cyan-100 hover:bg-cyan-300/10 hover:text-white">Ver lançamentos <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </article>
            <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d2423]/80 p-6 shadow-[0_22px_50px_-35px_rgba(0,0,0,0.95)]">
              <div className="absolute -right-14 -top-12 h-36 w-36 rounded-full bg-orange-400/20 blur-3xl" />
              <div className="relative">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-orange-200">Propriedade ativa</p>
                <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em] text-white">{property?.name ?? "Selecione uma propriedade"}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">{property?.municipality ? `${property.municipality}${property.state ? `, ${property.state}` : ""}` : "Os indicadores são calculados exclusivamente para a propriedade selecionada."}</p>
                <div className="mt-7 border-t border-white/10 pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Atividade principal</p>
                  <p className="mt-2 text-sm font-semibold text-slate-200">{property?.mainActivity || "Não informada"}</p>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

function ResultLine({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/10 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-extrabold ${positive ? "text-cyan-200" : "text-white"}`}>{value}</span>
    </div>
  );
}
