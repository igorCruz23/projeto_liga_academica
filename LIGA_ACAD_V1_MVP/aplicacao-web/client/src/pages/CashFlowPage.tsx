import { EmptyState } from "@/components/EmptyState";
import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { PropertySelector } from "@/components/PropertySelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSelectedProperty } from "@/hooks/useSelectedProperty";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CircleDollarSign, Landmark, Plus, ReceiptText, TrendingUp } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const ranges = [
  { value: "dia", label: "Dia" },
  { value: "mes", label: "Mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
] as const;

const entryTypes = [
  { value: "receita", label: "Receita", direction: "entrada" },
  { value: "custo_producao", label: "Custo de produção", direction: "saída" },
  { value: "despesa_administrativa", label: "Despesa administrativa", direction: "saída" },
  { value: "imposto", label: "Imposto", direction: "saída" },
  { value: "deducao", label: "Dedução", direction: "saída" },
] as const;

type EntryForm = { entryType: (typeof entryTypes)[number]["value"]; category: string; description: string; occurredOn: string; amount: string };

function initialEntryForm(): EntryForm {
  return { entryType: "receita", category: "", description: "", occurredOn: new Date().toISOString().slice(0, 10), amount: "" };
}

export default function CashFlowPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { propertyId, setPropertyId } = useSelectedProperty();
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("mes");
  const [referenceDate, setReferenceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EntryForm>(initialEntryForm);
  const propertiesQuery = trpc.finance.properties.list.useQuery();
  const entriesQuery = trpc.finance.entries.list.useQuery(
    { propertyId: propertyId ?? 0, range, referenceDate },
    { enabled: Boolean(propertyId) }
  );
  const summaryQuery = trpc.finance.dashboard.summary.useQuery(
    { propertyId: propertyId ?? 0, range, referenceDate },
    { enabled: Boolean(propertyId) }
  );
  const createEntry = trpc.finance.entries.create.useMutation({
    onSuccess: () => {
      void utils.finance.entries.list.invalidate();
      void utils.finance.dashboard.summary.invalidate();
      setForm(initialEntryForm());
      setOpen(false);
      toast.success("Lançamento registrado no fluxo de caixa.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyId) return toast.error("Selecione uma propriedade antes de registrar um lançamento.");
    createEntry.mutate({
      propertyId,
      entryType: form.entryType,
      category: form.category,
      description: form.description,
      occurredOn: form.occurredOn,
      amount: Number(form.amount.replace(",", ".")),
    });
  };

  const summary = summaryQuery.data?.summary;
  const period = entriesQuery.data?.period ?? summaryQuery.data?.period;
  const hasProperties = Boolean(propertiesQuery.data?.length);

  if (propertiesQuery.isLoading) {
    return <LoadingState title="A carregar as propriedades para o fluxo de caixa" />;
  }

  if (propertiesQuery.isError || entriesQuery.isError || summaryQuery.isError) {
    return <QueryErrorState onRetry={() => { void propertiesQuery.refetch(); void entriesQuery.refetch(); void summaryQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-7 sm:space-y-9">
      <PageHeader
        eyebrow="Movimentação financeira"
        title="Fluxo de caixa sob controlo."
        description="Registre entradas e saídas. O saldo e os resultados são atualizados automaticamente para a propriedade e o período selecionados."
        action={<EntryDialog open={open} onOpenChange={setOpen} form={form} setForm={setForm} onSubmit={submit} loading={createEntry.isPending} disabled={!propertyId} />}
      />

      {!hasProperties && !propertiesQuery.isLoading ? (
        <EmptyState icon={Landmark} title="Cadastre uma propriedade antes de movimentar o caixa" description="Os lançamentos precisam estar vinculados a uma propriedade, garantindo que os cálculos financeiros não sejam misturados." action={<Button onClick={() => setLocation("/propriedades")} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">Ir para propriedades</Button>} />
      ) : (
        <>
          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_20px_45px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:grid-cols-[minmax(260px,1fr)_160px_180px] lg:items-center">
            <PropertySelector properties={propertiesQuery.data} value={propertyId} onChange={setPropertyId} disabled={propertiesQuery.isLoading} />
            <Select value={range} onValueChange={value => setRange(value as typeof range)}>
              <SelectTrigger className="h-11 border-white/10 bg-[#081d20]/70 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="border-white/10 bg-[#0b2024] text-slate-100">{ranges.map(item => <SelectItem key={item.value} value={item.value} className="focus:bg-white/10 focus:text-white">{item.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input aria-label="Data de referência do filtro" type="date" value={referenceDate} onChange={event => setReferenceDate(event.target.value)} className="h-11 border-white/10 bg-[#081d20]/70 text-slate-100 [color-scheme:dark] focus-visible:ring-cyan-300" />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <MetricCard label="Saldo do fluxo" value={formatCurrency(summary?.cashBalance)} description="Saldo das entradas após todas as saídas." icon={CircleDollarSign} accent="cyan" />
            <MetricCard label="Entradas" value={formatCurrency(summary?.totalRevenue)} description="Receitas registadas dentro do período." icon={ArrowUpRight} accent="lime" />
            <MetricCard label="Saídas" value={formatCurrency((summary?.productionCosts ?? 0) + (summary?.administrativeExpenses ?? 0) + (summary?.taxes ?? 0) + (summary?.deductions ?? 0))} description="Custos, despesas, impostos e deduções." icon={ArrowDownRight} accent="orange" />
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a2023]/70 shadow-[0_22px_50px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cyan-300">Lançamentos do período</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-white">{period ? formatPeriod(period.startDate, period.endDate) : "Selecione uma propriedade"}</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><CalendarDays className="h-4 w-4 text-orange-200" />{entriesQuery.data?.entries.length ?? 0} movimentos</div>
            </div>
            {!entriesQuery.isLoading && !entriesQuery.data?.entries.length ? (
              <div className="px-6 py-12"><EmptyState icon={ReceiptText} title="Nenhum lançamento neste período" description="Registre uma receita ou uma saída para formar o fluxo de caixa e atualizar os resultados." action={<Button onClick={() => setOpen(true)} className="bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300"><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button>} /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-white/10 hover:bg-transparent"><TableHead className="whitespace-nowrap px-6 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Data</TableHead><TableHead className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Lançamento</TableHead><TableHead className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Categoria</TableHead><TableHead className="px-6 text-right text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {entriesQuery.data?.entries.map(entry => {
                      const type = entryTypes.find(item => item.value === entry.entryType);
                      const receipt = entry.entryType === "receita";
                      return <TableRow key={entry.id} className="border-white/[0.08] hover:bg-white/[0.03]"><TableCell className="whitespace-nowrap px-6 text-sm text-slate-400">{formatDate(entry.occurredOn)}</TableCell><TableCell><div className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center rounded-lg ${receipt ? "bg-cyan-300/10 text-cyan-200" : "bg-orange-300/10 text-orange-200"}`}>{receipt ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}</span><div><p className="font-semibold text-slate-100">{entry.description}</p><p className="mt-0.5 text-xs text-slate-500">{type?.label}</p></div></div></TableCell><TableCell><Badge className="border border-white/10 bg-white/[0.04] font-medium text-slate-300 hover:bg-white/[0.04]">{entry.category}</Badge></TableCell><TableCell className={`px-6 text-right text-sm font-extrabold ${receipt ? "text-cyan-200" : "text-orange-100"}`}>{receipt ? "+" : "−"} {formatCurrency(entry.amount)}</TableCell></TableRow>;
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function EntryDialog({ open, onOpenChange, form, setForm, onSubmit, loading, disabled }: { open: boolean; onOpenChange: (open: boolean) => void; form: EntryForm; setForm: (form: EntryForm) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean; disabled: boolean }) {
  const update = (key: keyof EntryForm, value: string) => setForm({ ...form, [key]: value });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button disabled={disabled} className="h-11 bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300"><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button></DialogTrigger>
      <DialogContent className="border-white/10 bg-[#082023] p-0 text-slate-100 sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader className="border-b border-white/10 px-6 py-6"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-orange-300/10 text-orange-200"><ReceiptText className="h-5 w-5" /></div><DialogTitle className="text-2xl font-extrabold tracking-[-0.04em] text-white">Novo lançamento</DialogTitle><DialogDescription className="leading-6 text-slate-400">Informe o tipo, a categoria e o valor. O painel será recalculado automaticamente.</DialogDescription></DialogHeader>
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <EntryField label="Tipo" required><Select value={form.entryType} onValueChange={value => update("entryType", value)}><SelectTrigger className="h-11 border-white/10 bg-white/[0.05] text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-[#0b2024] text-slate-100">{entryTypes.map(item => <SelectItem key={item.value} value={item.value} className="focus:bg-white/10 focus:text-white">{item.label}</SelectItem>)}</SelectContent></Select></EntryField>
            <EntryField label="Data" required><Input required type="date" value={form.occurredOn} onChange={event => update("occurredOn", event.target.value)} className="h-11 border-white/10 bg-white/[0.05] text-white [color-scheme:dark] focus-visible:ring-cyan-300" /></EntryField>
            <EntryField label="Categoria" required><Input required value={form.category} onChange={event => update("category", event.target.value)} placeholder="Ex.: Venda de gado" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></EntryField>
            <EntryField label="Valor (R$)" required><Input required type="number" min="0.01" step="0.01" value={form.amount} onChange={event => update("amount", event.target.value)} placeholder="0,00" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></EntryField>
            <EntryField label="Descrição" required className="sm:col-span-2"><Input required value={form.description} onChange={event => update("description", event.target.value)} placeholder="Descreva brevemente a movimentação" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></EntryField>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 py-5"><Button type="submit" disabled={loading} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">{loading ? "A guardar..." : "Registrar lançamento"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EntryField({ label, required = false, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-2 block text-xs font-bold text-slate-300">{label}{required ? <span className="ml-1 text-cyan-300">*</span> : null}</Label>{children}</div>;
}
