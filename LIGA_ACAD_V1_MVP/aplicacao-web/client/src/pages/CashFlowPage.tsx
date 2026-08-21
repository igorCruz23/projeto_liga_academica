import { EmptyState } from "@/components/EmptyState";
import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { PropertySelector } from "@/components/PropertySelector";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSelectedProperty } from "@/hooks/useSelectedProperty";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CircleDollarSign, Landmark, Pencil, Plus, ReceiptText, Trash2, TriangleAlert, WalletCards } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
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
  { value: "custo_fixo", label: "Custo fixo", direction: "saída" },
  { value: "custo_variavel", label: "Custo variável", direction: "saída" },
  { value: "custo_producao", label: "Custo de produção", direction: "saída" },
  { value: "despesa_administrativa", label: "Despesa administrativa", direction: "saída" },
  { value: "imposto", label: "Imposto ou taxa", direction: "saída" },
  { value: "deducao", label: "Dedução", direction: "saída" },
] as const;

const settlementOptions = [
  { value: "liquidado", label: "Liquidado" },
  { value: "pendente", label: "Pendente" },
] as const;

type EntryForm = {
  entryType: (typeof entryTypes)[number]["value"];
  category: string;
  activity: string;
  description: string;
  occurredOn: string;
  dueOn: string;
  settlementStatus: (typeof settlementOptions)[number]["value"];
  amount: string;
};

function initialEntryForm(): EntryForm {
  return {
    entryType: "receita",
    category: "",
    activity: "",
    description: "",
    occurredOn: new Date().toISOString().slice(0, 10),
    dueOn: "",
    settlementStatus: "liquidado",
    amount: "",
  };
}

function toInputDate(value: Date | string | null) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

export default function CashFlowPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { propertyId, setPropertyId } = useSelectedProperty();
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("mes");
  const [referenceDate, setReferenceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activityFilter, setActivityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [form, setForm] = useState<EntryForm>(initialEntryForm);
  const propertiesQuery = trpc.finance.properties.list.useQuery();
  const queryInput = useMemo(() => ({
    propertyId: propertyId ?? 0,
    range,
    referenceDate,
    activity: activityFilter === "all" ? undefined : activityFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    settlementStatus: statusFilter === "all" ? undefined : statusFilter as "recebido" | "pago" | "pendente" | "vencido",
  }), [activityFilter, categoryFilter, propertyId, range, referenceDate, statusFilter]);
  const entriesQuery = trpc.finance.entries.list.useQuery(queryInput, { enabled: Boolean(propertyId) });
  const summaryQuery = trpc.finance.dashboard.summary.useQuery(queryInput, { enabled: Boolean(propertyId) });

  const refreshFinancialData = () => {
    void utils.finance.entries.list.invalidate();
    void utils.finance.dashboard.summary.invalidate();
  };
  const closeDialog = () => {
    setOpen(false);
    setEditingEntryId(null);
    setForm(initialEntryForm());
  };
  const createEntry = trpc.finance.entries.create.useMutation({
    onSuccess: () => {
      refreshFinancialData();
      closeDialog();
      toast.success("Lançamento registado no fluxo de caixa.");
    },
    onError: error => toast.error(error.message),
  });
  const updateEntry = trpc.finance.entries.update.useMutation({
    onSuccess: () => {
      refreshFinancialData();
      closeDialog();
      toast.success("Lançamento atualizado com sucesso.");
    },
    onError: error => toast.error(error.message),
  });
  const deleteEntry = trpc.finance.entries.delete.useMutation({
    onSuccess: () => {
      refreshFinancialData();
      toast.success("Lançamento excluído do fluxo de caixa.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyId) return toast.error("Selecione uma propriedade antes de registar um lançamento.");
    const values = {
      propertyId,
      entryType: form.entryType,
      category: form.category,
      activity: form.activity,
      description: form.description,
      occurredOn: form.occurredOn,
      dueOn: form.dueOn || undefined,
      settlementStatus: form.settlementStatus,
      amount: Number(form.amount.replace(",", ".")),
    };
    if (editingEntryId) updateEntry.mutate({ ...values, entryId: editingEntryId });
    else createEntry.mutate(values);
  };

  const openCreate = () => {
    setEditingEntryId(null);
    setForm(initialEntryForm());
    setOpen(true);
  };
  const openEdit = (entry: NonNullable<typeof entriesQuery.data>["entries"][number]) => {
    setEditingEntryId(entry.id);
    setForm({
      entryType: entry.entryType,
      category: entry.category,
      activity: entry.activity,
      description: entry.description,
      occurredOn: toInputDate(entry.occurredOn),
      dueOn: toInputDate(entry.dueOn),
      settlementStatus: entry.settlementStatus,
      amount: String(entry.amount),
    });
    setOpen(true);
  };

  const summary = summaryQuery.data?.summary;
  const period = entriesQuery.data?.period ?? summaryQuery.data?.period;
  const hasProperties = Boolean(propertiesQuery.data?.length);
  const isMutating = createEntry.isPending || updateEntry.isPending;

  if (propertiesQuery.isLoading) return <LoadingState title="A carregar as propriedades para o fluxo de caixa" />;
  if (propertiesQuery.isError || entriesQuery.isError || summaryQuery.isError) {
    return <QueryErrorState onRetry={() => { void propertiesQuery.refetch(); void entriesQuery.refetch(); void summaryQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-7 sm:space-y-9">
      <PageHeader
        eyebrow="Movimentação financeira"
        title="Fluxo de caixa sob controlo."
        description="Classifique receitas, custos e despesas por atividade. Acompanhe situação, pendências e saldo disponível sem misturar o resultado económico."
        action={<Button onClick={openCreate} disabled={!propertyId} className="h-11 bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300"><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button>}
      />

      {!hasProperties ? (
        <EmptyState icon={Landmark} title="Cadastre uma propriedade antes de movimentar o caixa" description="Os lançamentos precisam estar vinculados a uma propriedade, garantindo que os cálculos financeiros não sejam misturados." action={<Button onClick={() => setLocation("/propriedades")} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">Ir para propriedades</Button>} />
      ) : (
        <>
          <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_20px_45px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl xl:grid-cols-[minmax(270px,1.4fr)_140px_180px_minmax(190px,1fr)_minmax(190px,1fr)] xl:items-center">
            <PropertySelector properties={propertiesQuery.data} value={propertyId} onChange={setPropertyId} disabled={propertiesQuery.isLoading} />
            <Select value={range} onValueChange={value => setRange(value as typeof range)}><SelectTrigger className="h-11 border-white/10 bg-[#081d20]/70 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-[#0b2024] text-slate-100">{ranges.map(item => <SelectItem key={item.value} value={item.value} className="focus:bg-white/10 focus:text-white">{item.label}</SelectItem>)}</SelectContent></Select>
            <Input aria-label="Data de referência" type="date" value={referenceDate} onChange={event => setReferenceDate(event.target.value)} className="h-11 border-white/10 bg-[#081d20]/70 text-slate-100 [color-scheme:dark] focus-visible:ring-cyan-300" />
            <Select value={activityFilter} onValueChange={setActivityFilter}><SelectTrigger className="h-11 border-white/10 bg-[#081d20]/70 text-white"><SelectValue placeholder="Atividade" /></SelectTrigger><SelectContent className="border-white/10 bg-[#0b2024] text-slate-100"><SelectItem value="all">Todas as atividades</SelectItem>{entriesQuery.data?.activities.map(activity => <SelectItem key={activity} value={activity}>{activity}</SelectItem>)}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-11 border-white/10 bg-[#081d20]/70 text-white"><SelectValue placeholder="Situação" /></SelectTrigger><SelectContent className="border-white/10 bg-[#0b2024] text-slate-100"><SelectItem value="all">Todas as situações</SelectItem><SelectItem value="recebido">Recebidos</SelectItem><SelectItem value="pago">Pagos</SelectItem><SelectItem value="pendente">Pendentes</SelectItem><SelectItem value="vencido">Vencidos</SelectItem></SelectContent></Select>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#071c20]/65 p-4 sm:flex-row sm:items-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Categoria</span>
            <div className="min-w-0 flex-1"><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="h-10 border-white/10 bg-white/[0.04] text-slate-100"><SelectValue placeholder="Todas as categorias" /></SelectTrigger><SelectContent className="border-white/10 bg-[#0b2024] text-slate-100"><SelectItem value="all">Todas as categorias</SelectItem>{entriesQuery.data?.categories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
            {(activityFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all") ? <Button variant="outline" onClick={() => { setActivityFilter("all"); setCategoryFilter("all"); setStatusFilter("all"); }} className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white">Limpar filtros</Button> : null}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Saldo disponível" value={formatCurrency(summary?.cashBalance)} description="Apenas receitas recebidas e saídas pagas." icon={CircleDollarSign} accent="cyan" />
            <MetricCard label="Receitas do período" value={formatCurrency(summary?.totalRevenue)} description="Resultado económico por competência." icon={ArrowUpRight} accent="lime" />
            <MetricCard label="Pendências" value={formatCurrency(summary?.pendingAmount)} description="Movimentos ainda não liquidados." icon={WalletCards} accent="orange" />
            <MetricCard label="Vencidos" value={formatCurrency(summary?.overdueAmount)} description="Pendências com vencimento ultrapassado." icon={TriangleAlert} accent="orange" />
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a2023]/70 shadow-[0_22px_50px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cyan-300">Lançamentos do período</p><h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-white">{period ? formatPeriod(period.startDate, period.endDate) : "Selecione uma propriedade"}</h2></div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><CalendarDays className="h-4 w-4 text-orange-200" />{entriesQuery.data?.entries.length ?? 0} movimentos</div>
            </div>
            {!entriesQuery.isLoading && !entriesQuery.data?.entries.length ? (
              <div className="px-6 py-12"><EmptyState icon={ReceiptText} title="Nenhum lançamento neste recorte" description="Ajuste os filtros ou registe uma receita, custo ou despesa para compor o fluxo de caixa." action={<Button onClick={openCreate} className="bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300"><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button>} /></div>
            ) : (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow className="border-white/10 hover:bg-transparent"><TableHead className="whitespace-nowrap px-6 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Data</TableHead><TableHead className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Lançamento</TableHead><TableHead className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Classificação</TableHead><TableHead className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Situação</TableHead><TableHead className="px-6 text-right text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Valor</TableHead><TableHead className="px-6 text-right text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ações</TableHead></TableRow></TableHeader><TableBody>
                {entriesQuery.data?.entries.map(entry => {
                  const type = entryTypes.find(item => item.value === entry.entryType);
                  const receipt = entry.entryType === "receita";
                  return <TableRow key={entry.id} className="border-white/[0.08] hover:bg-white/[0.03]"><TableCell className="whitespace-nowrap px-6 text-sm text-slate-400">{formatDate(entry.occurredOn)}</TableCell><TableCell><div className="flex items-center gap-3"><span className={`grid h-8 w-8 place-items-center rounded-lg ${receipt ? "bg-cyan-300/10 text-cyan-200" : "bg-orange-300/10 text-orange-200"}`}>{receipt ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}</span><div><p className="font-semibold text-slate-100">{entry.description}</p><p className="mt-0.5 text-xs text-slate-500">{type?.label}</p></div></div></TableCell><TableCell><div className="space-y-1"><Badge className="border border-white/10 bg-white/[0.04] font-medium text-slate-300 hover:bg-white/[0.04]">{entry.category}</Badge><p className="text-xs text-slate-500">{entry.activity}</p></div></TableCell><TableCell><StatusBadge status={entry.displayStatus} dueOn={entry.dueOn} /></TableCell><TableCell className={`px-6 text-right text-sm font-extrabold ${receipt ? "text-cyan-200" : "text-orange-100"}`}>{receipt ? "+" : "−"} {formatCurrency(entry.amount)}</TableCell><TableCell className="px-6"><div className="flex justify-end gap-2"><Button size="icon" variant="outline" onClick={() => openEdit(entry)} className="h-8 w-8 border-white/10 bg-white/[0.03] text-slate-300 hover:bg-cyan-300/10 hover:text-cyan-100"><Pencil className="h-3.5 w-3.5" /><span className="sr-only">Editar lançamento</span></Button><DeleteEntryDialog description={entry.description} loading={deleteEntry.isPending} onConfirm={() => deleteEntry.mutate({ propertyId: propertyId!, entryId: entry.id })} /></div></TableCell></TableRow>;
                })}
              </TableBody></Table></div>
            )}
          </section>
        </>
      )}

      <EntryDialog open={open} onOpenChange={next => { if (next) setOpen(true); else closeDialog(); }} form={form} setForm={setForm} onSubmit={submit} loading={isMutating} editing={Boolean(editingEntryId)} />
    </div>
  );
}

function StatusBadge({ status, dueOn }: { status: "recebido" | "pago" | "pendente" | "vencido"; dueOn: Date | string | null }) {
  const styles = { recebido: "border-cyan-200/15 bg-cyan-300/10 text-cyan-100", pago: "border-lime-200/15 bg-lime-300/10 text-lime-100", pendente: "border-orange-200/15 bg-orange-300/10 text-orange-100", vencido: "border-red-200/15 bg-red-400/10 text-red-100" };
  return <div className="space-y-1"><Badge className={`border font-semibold capitalize hover:bg-inherit ${styles[status]}`}>{status}</Badge>{dueOn && status !== "pago" && status !== "recebido" ? <p className="whitespace-nowrap text-xs text-slate-500">Venceu em {formatDate(dueOn)}</p> : null}</div>;
}

function DeleteEntryDialog({ description, onConfirm, loading }: { description: string; onConfirm: () => void; loading: boolean }) {
  return <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="outline" className="h-8 w-8 border-orange-200/15 bg-transparent text-orange-200 hover:bg-orange-300/10 hover:text-orange-100"><Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Excluir lançamento</span></Button></AlertDialogTrigger><AlertDialogContent className="border-white/10 bg-[#082023] text-slate-100 sm:max-w-md"><AlertDialogHeader><AlertDialogTitle className="text-xl font-extrabold text-white">Excluir lançamento?</AlertDialogTitle><AlertDialogDescription className="leading-6 text-slate-400">“{description}” será removido e os indicadores do período serão recalculados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white">Cancelar</AlertDialogCancel><AlertDialogAction onClick={onConfirm} disabled={loading} className="bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300">{loading ? "A excluir..." : "Excluir lançamento"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function EntryDialog({ open, onOpenChange, form, setForm, onSubmit, loading, editing }: { open: boolean; onOpenChange: (open: boolean) => void; form: EntryForm; setForm: (form: EntryForm) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean; editing: boolean }) {
  const update = (key: keyof EntryForm, value: string) => setForm({ ...form, [key]: value });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#082023] p-0 text-slate-100 sm:max-w-2xl"><form onSubmit={onSubmit}><DialogHeader className="border-b border-white/10 px-6 py-6"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-orange-300/10 text-orange-200"><ReceiptText className="h-5 w-5" /></div><DialogTitle className="text-2xl font-extrabold tracking-[-0.04em] text-white">{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle><DialogDescription className="leading-6 text-slate-400">Classifique a atividade e a situação para separar resultado económico, saldo disponível e pendências.</DialogDescription></DialogHeader><div className="grid gap-5 px-6 py-6 sm:grid-cols-2"><EntryField label="Tipo" required><Select value={form.entryType} onValueChange={value => update("entryType", value)}><SelectTrigger className="h-11 border-white/10 bg-white/[0.05] text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-[#0b2024] text-slate-100">{entryTypes.map(item => <SelectItem key={item.value} value={item.value} className="focus:bg-white/10 focus:text-white">{item.label}</SelectItem>)}</SelectContent></Select></EntryField><EntryField label="Situação" required><Select value={form.settlementStatus} onValueChange={value => update("settlementStatus", value)}><SelectTrigger className="h-11 border-white/10 bg-white/[0.05] text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-[#0b2024] text-slate-100">{settlementOptions.map(item => <SelectItem key={item.value} value={item.value} className="focus:bg-white/10 focus:text-white">{item.label}</SelectItem>)}</SelectContent></Select></EntryField><EntryField label="Data de competência" required><Input required type="date" value={form.occurredOn} onChange={event => update("occurredOn", event.target.value)} className="h-11 border-white/10 bg-white/[0.05] text-white [color-scheme:dark] focus-visible:ring-cyan-300" /></EntryField><EntryField label="Vencimento"><Input type="date" value={form.dueOn} onChange={event => update("dueOn", event.target.value)} className="h-11 border-white/10 bg-white/[0.05] text-white [color-scheme:dark] focus-visible:ring-cyan-300" /></EntryField><EntryField label="Categoria" required><Input required value={form.category} onChange={event => update("category", event.target.value)} placeholder="Ex.: Venda de gado" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></EntryField><EntryField label="Atividade produtiva" required><Input required value={form.activity} onChange={event => update("activity", event.target.value)} placeholder="Ex.: Pecuária de corte" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></EntryField><EntryField label="Valor (R$)" required><Input required type="number" min="0.01" step="0.01" value={form.amount} onChange={event => update("amount", event.target.value)} placeholder="0,00" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></EntryField><EntryField label="Descrição" required className="sm:col-span-2"><Input required value={form.description} onChange={event => update("description", event.target.value)} placeholder="Descreva brevemente a movimentação" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></EntryField></div><DialogFooter className="border-t border-white/10 px-6 py-5"><Button type="submit" disabled={loading} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">{loading ? "A guardar..." : editing ? "Guardar alterações" : "Registar lançamento"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function EntryField({ label, required = false, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-2 block text-xs font-bold text-slate-300">{label}{required ? <span className="ml-1 text-cyan-300">*</span> : null}</Label>{children}</div>;
}
