import { EmptyState } from "@/components/EmptyState";
import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSelectedProperty } from "@/hooks/useSelectedProperty";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LandPlot, Landmark, MapPin, Plus, Sprout, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PropertyForm = {
  name: string;
  municipality: string;
  state: string;
  totalArea: string;
  mainActivity: string;
  description: string;
};

const initialForm: PropertyForm = { name: "", municipality: "", state: "", totalArea: "", mainActivity: "", description: "" };

export default function PropertiesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { propertyId, setPropertyId } = useSelectedProperty();
  const propertiesQuery = trpc.finance.properties.list.useQuery();
  const profileQuery = trpc.finance.profile.get.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PropertyForm>(initialForm);
  const createProperty = trpc.finance.properties.create.useMutation({
    onSuccess: property => {
      void utils.finance.properties.list.invalidate();
      if (property) setPropertyId(property.id);
      setForm(initialForm);
      setOpen(false);
      toast.success("Propriedade cadastrada com sucesso.");
    },
    onError: error => toast.error(error.message),
  });
  const deactivateProperty = trpc.finance.properties.deactivate.useMutation({
    onSuccess: result => {
      void utils.finance.properties.list.invalidate();
      void utils.finance.dashboard.summary.invalidate();
      void utils.finance.entries.list.invalidate();
      if (propertyId === result.id) setPropertyId(undefined);
      toast.success("Propriedade removida com segurança. Os lançamentos foram preservados.");
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createProperty.mutate({
      name: form.name,
      municipality: form.municipality || undefined,
      state: form.state || undefined,
      totalArea: form.totalArea ? Number(form.totalArea.replace(",", ".")) : undefined,
      mainActivity: form.mainActivity || undefined,
      description: form.description || undefined,
    });
  };

  if (propertiesQuery.isLoading) {
    return <LoadingState title="A carregar as suas propriedades" />;
  }

  if (propertiesQuery.isError) {
    return <QueryErrorState onRetry={() => { void propertiesQuery.refetch(); }} />;
  }

  const canRemoveProperty =
    user?.role === "admin" ||
    profileQuery.data?.profileRole === "gestor" ||
    profileQuery.data?.profileRole === "administrador";

  return (
    <div className="space-y-7 sm:space-y-9">
      <PageHeader
        eyebrow="Base da operação"
        title="Suas propriedades rurais."
        description="Cada propriedade organiza seu próprio fluxo de caixa e seus indicadores. Você pode cadastrar mais de uma e alternar a análise no painel."
        action={<PropertyDialog open={open} onOpenChange={setOpen} form={form} setForm={setForm} onSubmit={submit} loading={createProperty.isPending} />}
      />

      {!propertiesQuery.isLoading && !propertiesQuery.data?.length ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma propriedade cadastrada"
          description="Comece informando a propriedade que deseja acompanhar. Os campos de local, área e atividade são opcionais, mas ajudam a identificar a operação."
          action={<Button onClick={() => setOpen(true)} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200"><Plus className="mr-2 h-4 w-4" /> Cadastrar propriedade</Button>}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {propertiesQuery.data?.map(property => {
            const selected = property.id === propertyId;
            return (
              <article key={property.id} className={`group relative overflow-hidden rounded-2xl border p-5 shadow-[0_22px_50px_-35px_rgba(0,0,0,0.95)] transition ${selected ? "border-cyan-200/30 bg-cyan-300/[0.075]" : "border-white/10 bg-[#0a2023]/70 hover:border-white/20"}`}>
                <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl from-orange-400/10 to-transparent" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-200"><LandPlot className="h-5 w-5" /></div>
                  {selected ? <Badge className="border border-cyan-200/15 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/10">Em análise</Badge> : null}
                </div>
                <div className="relative mt-6">
                  <h2 className="text-xl font-extrabold tracking-[-0.04em] text-white">{property.name}</h2>
                  <p className="mt-2 flex min-h-5 items-center text-sm text-slate-400"><MapPin className="mr-1.5 h-3.5 w-3.5 text-orange-200" />{property.municipality ? `${property.municipality}${property.state ? `, ${property.state}` : ""}` : "Localização não informada"}</p>
                  <div className="mt-6 grid gap-3 border-t border-white/10 pt-4 text-sm">
                    <PropertyMeta label="Atividade" value={property.mainActivity || "Não informada"} />
                    <PropertyMeta label="Área" value={property.totalArea ? `${Number(property.totalArea).toLocaleString("pt-BR")} ha` : "Não informada"} />
                  </div>
                  <Button
                    onClick={() => { setPropertyId(property.id); setLocation("/"); }}
                    variant="outline"
                    className="mt-6 w-full border-white/10 bg-white/[0.03] text-slate-200 hover:bg-cyan-300/10 hover:text-cyan-100"
                  >
                    {selected ? "Ver visão geral" : "Analisar propriedade"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  {canRemoveProperty ? (
                    <RemovePropertyDialog
                      propertyName={property.name}
                      onConfirm={() => deactivateProperty.mutate({ propertyId: property.id })}
                      loading={deactivateProperty.isPending}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
          <button onClick={() => setOpen(true)} className="group flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-200 transition group-hover:bg-cyan-300/10"><Plus className="h-5 w-5" /></span>
            <span className="mt-4 text-sm font-bold text-white">Adicionar outra propriedade</span>
            <span className="mt-2 max-w-52 text-sm leading-6 text-slate-500">Amplie o acompanhamento sem misturar os resultados.</span>
          </button>
        </section>
      )}
    </div>
  );
}

function PropertyMeta({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className="truncate font-semibold text-slate-200">{value}</span></div>;
}

function RemovePropertyDialog({
  propertyName,
  onConfirm,
  loading,
}: {
  propertyName: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="mt-3 w-full border-orange-200/15 bg-transparent text-orange-200 hover:bg-orange-300/10 hover:text-orange-100">
          <Trash2 className="mr-2 h-4 w-4" /> Remover propriedade
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-white/10 bg-[#082023] text-slate-100 sm:max-w-md">
        <AlertDialogHeader>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl border border-orange-200/15 bg-orange-300/10 text-orange-200"><Trash2 className="h-5 w-5" /></div>
          <AlertDialogTitle className="text-xl font-extrabold tracking-[-0.04em] text-white">Remover {propertyName}?</AlertDialogTitle>
          <AlertDialogDescription className="leading-6 text-slate-400">A propriedade será inativada e deixará de aparecer no painel. Os lançamentos financeiros serão preservados para manter o histórico económico.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-3">
          <AlertDialogCancel className="border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading} className="bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300">{loading ? "A remover..." : "Remover com segurança"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PropertyDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PropertyForm;
  setForm: (form: PropertyForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}) {
  const update = (key: keyof PropertyForm, value: string) => setForm({ ...form, [key]: value });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button className="h-11 bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300"><Plus className="mr-2 h-4 w-4" /> Nova propriedade</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#082023] p-0 text-slate-100 sm:max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader className="border-b border-white/10 px-6 py-6">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><Sprout className="h-5 w-5" /></div>
            <DialogTitle className="text-2xl font-extrabold tracking-[-0.04em] text-white">Cadastrar propriedade</DialogTitle>
            <DialogDescription className="leading-6 text-slate-400">Os campos marcados são necessários para criar o espaço financeiro da propriedade.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <Field label="Nome da propriedade" required className="sm:col-span-2"><Input required value={form.name} onChange={event => update("name", event.target.value)} placeholder="Ex.: Fazenda Santa Luzia" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field>
            <Field label="Município"><Input value={form.municipality} onChange={event => update("municipality", event.target.value)} placeholder="Ex.: Uberaba" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field>
            <Field label="UF"><Input value={form.state} onChange={event => update("state", event.target.value.toUpperCase().slice(0, 2))} placeholder="MG" maxLength={2} className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field>
            <Field label="Área total (ha)"><Input type="number" min="0.01" step="0.01" value={form.totalArea} onChange={event => update("totalArea", event.target.value)} placeholder="Ex.: 245,50" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field>
            <Field label="Atividade principal"><Input value={form.mainActivity} onChange={event => update("mainActivity", event.target.value)} placeholder="Ex.: Pecuária de corte" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field>
            <Field label="Descrição" className="sm:col-span-2"><Textarea value={form.description} onChange={event => update("description", event.target.value)} placeholder="Uma breve identificação da operação, se desejar." className="min-h-24 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 py-5"><Button type="submit" disabled={loading} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">{loading ? "A guardar..." : "Criar propriedade"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required = false, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-2 block text-xs font-bold text-slate-300">{label}{required ? <span className="ml-1 text-cyan-300">*</span> : null}</Label>{children}</div>;
}
