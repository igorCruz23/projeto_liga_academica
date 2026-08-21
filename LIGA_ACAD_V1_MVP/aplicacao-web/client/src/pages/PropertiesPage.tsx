import { EmptyState } from "@/components/EmptyState";
import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSelectedProperty } from "@/hooks/useSelectedProperty";
import { trpc } from "@/lib/trpc";
import { ArrowRight, LandPlot, Landmark, Link2, MapPin, Plus, Sprout, Trash2, UserPlus, UsersRound } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type DomainUser = { cpf: string; name: string; sex: "feminino" | "masculino" | "outro" | "nao_informar" };
type PropertyForm = { name: string; municipality: string; state: string; totalArea: string; mainActivity: string; description: string; userCpfs: string[] };
type DomainUserForm = { cpf: string; name: string; sex: DomainUser["sex"] };

const initialForm: PropertyForm = { name: "", municipality: "", state: "", totalArea: "", mainActivity: "", description: "", userCpfs: [] };
const initialDomainUserForm: DomainUserForm = { cpf: "", name: "", sex: "nao_informar" };

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCpfForList(cpf: string) {
  return `•••.•••.•••-${cpf.slice(-2)}`;
}

export default function PropertiesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { propertyId, setPropertyId } = useSelectedProperty();
  const propertiesQuery = trpc.finance.properties.list.useQuery();
  const domainUsersQuery = trpc.finance.domainUsers.list.useQuery();
  const profileQuery = trpc.finance.profile.get.useQuery();
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [domainUserOpen, setDomainUserOpen] = useState(false);
  const [linkProperty, setLinkProperty] = useState<{ id: number; name: string; domainUsers: DomainUser[] } | null>(null);
  const [form, setForm] = useState<PropertyForm>(initialForm);
  const [domainUserForm, setDomainUserForm] = useState<DomainUserForm>(initialDomainUserForm);
  const refreshProperties = () => { void utils.finance.properties.list.invalidate(); };

  const createProperty = trpc.finance.properties.create.useMutation({
    onSuccess: property => {
      refreshProperties();
      if (property) setPropertyId(property.id);
      setForm(initialForm);
      setPropertyOpen(false);
      toast.success("Propriedade e vínculo de titularidade criados com sucesso.");
    },
    onError: error => toast.error(error.message),
  });
  const createDomainUser = trpc.finance.domainUsers.create.useMutation({
    onSuccess: userCreated => {
      void utils.finance.domainUsers.list.invalidate();
      if (userCreated) setForm(current => ({ ...current, userCpfs: Array.from(new Set([...current.userCpfs, userCreated.cpf])) }));
      setDomainUserForm(initialDomainUserForm);
      setDomainUserOpen(false);
      toast.success("Utilizador cadastrado. Ele já foi selecionado como proprietário da próxima propriedade.");
    },
    onError: error => toast.error(error.message),
  });
  const linkUsers = trpc.finance.properties.linkUsers.useMutation({
    onSuccess: () => {
      refreshProperties();
      setLinkProperty(null);
      toast.success("Coproprietários vinculados à propriedade.");
    },
    onError: error => toast.error(error.message),
  });
  const deactivateProperty = trpc.finance.properties.deactivate.useMutation({
    onSuccess: result => {
      refreshProperties();
      void utils.finance.dashboard.summary.invalidate();
      void utils.finance.entries.list.invalidate();
      if (propertyId === result.id) setPropertyId(undefined);
      toast.success("Propriedade removida com segurança. Os lançamentos foram preservados.");
    },
    onError: error => toast.error(error.message),
  });

  const submitProperty = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.userCpfs.length) return toast.error("Selecione pelo menos um utilizador proprietário.");
    createProperty.mutate({
      name: form.name,
      municipality: form.municipality || undefined,
      state: form.state || undefined,
      totalArea: form.totalArea ? Number(form.totalArea.replace(",", ".")) : undefined,
      mainActivity: form.mainActivity || undefined,
      description: form.description || undefined,
      userCpfs: form.userCpfs,
    });
  };
  const submitDomainUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createDomainUser.mutate({ cpf: domainUserForm.cpf, name: domainUserForm.name, sex: domainUserForm.sex });
  };

  if (propertiesQuery.isLoading || domainUsersQuery.isLoading) return <LoadingState title="A carregar propriedades e titulares" />;
  if (propertiesQuery.isError || domainUsersQuery.isError) return <QueryErrorState onRetry={() => { void propertiesQuery.refetch(); void domainUsersQuery.refetch(); }} />;

  const canRemoveProperty = user?.role === "admin" || profileQuery.data?.profileRole === "gestor" || profileQuery.data?.profileRole === "administrador";
  const domainUsers = domainUsersQuery.data ?? [];
  const hasDomainUsers = domainUsers.length > 0;
  const actions = <div className="flex flex-wrap gap-2"><Button onClick={() => setDomainUserOpen(true)} variant="outline" className="h-11 border-cyan-200/15 bg-transparent text-cyan-100 hover:bg-cyan-300/10 hover:text-white"><UserPlus className="mr-2 h-4 w-4" /> Novo utilizador</Button><Button onClick={() => setPropertyOpen(true)} disabled={!hasDomainUsers} className={`h-11 bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-orange-400/40 disabled:text-[#1a100b]/60 ${!hasDomainUsers ? "opacity-60" : ""}`}><Plus className="mr-2 h-4 w-4" /> Nova propriedade</Button></div>;

  return <div className="space-y-7 sm:space-y-9"><PageHeader eyebrow="Base da operação" title="Propriedades e titulares." description="Cada propriedade possui um ou mais proprietários vinculados. Cadastre primeiro a pessoa física e, em seguida, associe-a à operação rural." action={actions} />
    {!hasDomainUsers ? <EmptyState icon={UsersRound} title="Cadastre o primeiro utilizador proprietário" description="Antes de criar uma propriedade, informe ao menos um titular com nome, sexo e CPF válido. O CPF é exibido mascarado nas listas." action={<Button onClick={() => setDomainUserOpen(true)} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200"><UserPlus className="mr-2 h-4 w-4" /> Cadastrar utilizador</Button>} /> : !propertiesQuery.data?.length ? <EmptyState icon={Landmark} title="Nenhuma propriedade cadastrada" description="Selecione um ou mais utilizadores proprietários ao criar a primeira propriedade. Outros coproprietários poderão ser vinculados depois." action={<Button onClick={() => setPropertyOpen(true)} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200"><Plus className="mr-2 h-4 w-4" /> Cadastrar propriedade</Button>} /> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{propertiesQuery.data.map(property => {
      const selected = property.id === propertyId;
      return <article key={property.id} className={`group relative overflow-hidden rounded-2xl border p-5 shadow-[0_22px_50px_-35px_rgba(0,0,0,0.95)] transition ${selected ? "border-cyan-200/30 bg-cyan-300/[0.075]" : "border-white/10 bg-[#0a2023]/70 hover:border-white/20"}`}><div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl from-orange-400/10 to-transparent" /><div className="relative flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-200"><LandPlot className="h-5 w-5" /></div>{selected ? <Badge className="border border-cyan-200/15 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/10">Em análise</Badge> : null}</div><div className="relative mt-6"><h2 className="text-xl font-extrabold tracking-[-0.04em] text-white">{property.name}</h2><p className="mt-2 flex min-h-5 items-center text-sm text-slate-400"><MapPin className="mr-1.5 h-3.5 w-3.5 text-orange-200" />{property.municipality ? `${property.municipality}${property.state ? `, ${property.state}` : ""}` : "Localização não informada"}</p><div className="mt-6 grid gap-3 border-t border-white/10 pt-4 text-sm"><PropertyMeta label="Atividade" value={property.mainActivity || "Não informada"} /><PropertyMeta label="Área" value={property.totalArea ? `${Number(property.totalArea).toLocaleString("pt-BR")} ha` : "Não informada"} /></div><div className="mt-5 border-t border-white/10 pt-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Proprietários</p><Button variant="ghost" size="sm" onClick={() => setLinkProperty({ id: property.id, name: property.name, domainUsers: property.domainUsers })} className="h-7 px-2 text-xs text-cyan-200 hover:bg-cyan-300/10 hover:text-cyan-100"><Link2 className="mr-1.5 h-3.5 w-3.5" /> Vincular</Button></div><div className="mt-2 flex flex-wrap gap-1.5">{property.domainUsers.length ? property.domainUsers.map(domainUser => <Badge key={domainUser.cpf} className="max-w-full border border-white/10 bg-white/[0.04] font-medium text-slate-300 hover:bg-white/[0.04]" title={domainUser.name}>{domainUser.name} · {maskCpfForList(domainUser.cpf)}</Badge>) : <span className="text-xs text-orange-200">Sem titular vinculado</span>}</div></div><Button onClick={() => { setPropertyId(property.id); setLocation("/"); }} variant="outline" className="mt-6 w-full border-white/10 bg-white/[0.03] text-slate-200 hover:bg-cyan-300/10 hover:text-cyan-100">{selected ? "Ver visão geral" : "Analisar propriedade"} <ArrowRight className="ml-2 h-4 w-4" /></Button>{canRemoveProperty ? <RemovePropertyDialog propertyName={property.name} onConfirm={() => deactivateProperty.mutate({ propertyId: property.id })} loading={deactivateProperty.isPending} /> : null}</div></article>;
    })}<button onClick={() => setPropertyOpen(true)} className="group flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-200 transition group-hover:bg-cyan-300/10"><Plus className="h-5 w-5" /></span><span className="mt-4 text-sm font-bold text-white">Adicionar outra propriedade</span><span className="mt-2 max-w-52 text-sm leading-6 text-slate-500">Amplie o acompanhamento sem misturar os resultados.</span></button></section>}
    <PropertyDialog open={propertyOpen} onOpenChange={setPropertyOpen} form={form} setForm={setForm} onSubmit={submitProperty} loading={createProperty.isPending} users={domainUsers} />
    <DomainUserDialog open={domainUserOpen} onOpenChange={setDomainUserOpen} form={domainUserForm} setForm={setDomainUserForm} onSubmit={submitDomainUser} loading={createDomainUser.isPending} />
    <LinkUsersDialog property={linkProperty} users={domainUsers} onClose={() => setLinkProperty(null)} onConfirm={cpfs => { if (linkProperty) linkUsers.mutate({ propertyId: linkProperty.id, userCpfs: cpfs }); }} loading={linkUsers.isPending} />
  </div>;
}

function PropertyMeta({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className="truncate font-semibold text-slate-200">{value}</span></div>; }

function RemovePropertyDialog({ propertyName, onConfirm, loading }: { propertyName: string; onConfirm: () => void; loading: boolean }) { return <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="mt-3 w-full border-orange-200/15 bg-transparent text-orange-200 hover:bg-orange-300/10 hover:text-orange-100"><Trash2 className="mr-2 h-4 w-4" /> Remover propriedade</Button></AlertDialogTrigger><AlertDialogContent className="border-white/10 bg-[#082023] text-slate-100 sm:max-w-md"><AlertDialogHeader><div className="mb-2 grid h-10 w-10 place-items-center rounded-xl border border-orange-200/15 bg-orange-300/10 text-orange-200"><Trash2 className="h-5 w-5" /></div><AlertDialogTitle className="text-xl font-extrabold tracking-[-0.04em] text-white">Remover {propertyName}?</AlertDialogTitle><AlertDialogDescription className="leading-6 text-slate-400">A propriedade será inativada e os lançamentos financeiros serão preservados para manter o histórico económico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="mt-3"><AlertDialogCancel className="border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white">Cancelar</AlertDialogCancel><AlertDialogAction onClick={onConfirm} disabled={loading} className="bg-orange-400 font-bold text-[#1a100b] hover:bg-orange-300">{loading ? "A remover..." : "Remover com segurança"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>; }

function PropertyDialog({ open, onOpenChange, form, setForm, onSubmit, loading, users }: { open: boolean; onOpenChange: (open: boolean) => void; form: PropertyForm; setForm: (form: PropertyForm) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean; users: DomainUser[] }) {
  const update = (key: keyof Omit<PropertyForm, "userCpfs">, value: string) => setForm({ ...form, [key]: value });
  const toggleUser = (cpf: string) => setForm({ ...form, userCpfs: form.userCpfs.includes(cpf) ? form.userCpfs.filter(item => item !== cpf) : [...form.userCpfs, cpf] });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#082023] p-0 text-slate-100 sm:max-w-xl"><form onSubmit={onSubmit}><DialogHeader className="border-b border-white/10 px-6 py-6"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><Sprout className="h-5 w-5" /></div><DialogTitle className="text-2xl font-extrabold tracking-[-0.04em] text-white">Cadastrar propriedade</DialogTitle><DialogDescription className="leading-6 text-slate-400">Selecione pelo menos um proprietário para criar a operação e o seu espaço financeiro.</DialogDescription></DialogHeader><div className="grid gap-5 px-6 py-6 sm:grid-cols-2"><Field label="Proprietários" required className="sm:col-span-2"><OwnerCheckboxes users={users} selectedCpfs={form.userCpfs} onToggle={toggleUser} /></Field><Field label="Nome da propriedade" required className="sm:col-span-2"><Input required value={form.name} onChange={event => update("name", event.target.value)} placeholder="Ex.: Fazenda Santa Luzia" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field><Field label="Município"><Input value={form.municipality} onChange={event => update("municipality", event.target.value)} placeholder="Ex.: Uberaba" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field><Field label="UF"><Input value={form.state} onChange={event => update("state", event.target.value.toUpperCase().slice(0, 2))} placeholder="MG" maxLength={2} className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field><Field label="Área total (ha)"><Input type="number" min="0.01" step="0.01" value={form.totalArea} onChange={event => update("totalArea", event.target.value)} placeholder="Ex.: 245,50" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field><Field label="Atividade principal"><Input value={form.mainActivity} onChange={event => update("mainActivity", event.target.value)} placeholder="Ex.: Pecuária de corte" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field><Field label="Descrição" className="sm:col-span-2"><Textarea value={form.description} onChange={event => update("description", event.target.value)} placeholder="Uma breve identificação da operação, se desejar." className="min-h-24 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field></div><DialogFooter className="border-t border-white/10 px-6 py-5"><Button type="submit" disabled={loading || !form.userCpfs.length} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">{loading ? "A guardar..." : "Criar propriedade"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function DomainUserDialog({ open, onOpenChange, form, setForm, onSubmit, loading }: { open: boolean; onOpenChange: (open: boolean) => void; form: DomainUserForm; setForm: (form: DomainUserForm) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="border-white/10 bg-[#082023] p-0 text-slate-100 sm:max-w-lg"><form onSubmit={onSubmit}><DialogHeader className="border-b border-white/10 px-6 py-6"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-orange-300/10 text-orange-200"><UsersRound className="h-5 w-5" /></div><DialogTitle className="text-2xl font-extrabold tracking-[-0.04em] text-white">Cadastrar utilizador</DialogTitle><DialogDescription className="leading-6 text-slate-400">O CPF identifica o proprietário e é apresentado de forma mascarada nas listas.</DialogDescription></DialogHeader><div className="grid gap-5 px-6 py-6"><Field label="Nome completo" required><Input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Maria Aparecida da Silva" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field><Field label="CPF" required><Input required inputMode="numeric" value={maskCpf(form.cpf)} onChange={event => setForm({ ...form, cpf: event.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="000.000.000-00" className="h-11 border-white/10 bg-white/[0.05] text-white placeholder:text-slate-600 focus-visible:ring-cyan-300" /></Field><Field label="Sexo"><Select value={form.sex} onValueChange={value => setForm({ ...form, sex: value as DomainUser["sex"] })}><SelectTrigger className="h-11 border-white/10 bg-white/[0.05] text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-[#0b2024] text-slate-100"><SelectItem value="nao_informar">Prefiro não informar</SelectItem><SelectItem value="feminino">Feminino</SelectItem><SelectItem value="masculino">Masculino</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></Field></div><DialogFooter className="border-t border-white/10 px-6 py-5"><Button type="submit" disabled={loading} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">{loading ? "A guardar..." : "Cadastrar utilizador"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function LinkUsersDialog({ property, users, onClose, onConfirm, loading }: { property: { id: number; name: string; domainUsers: DomainUser[] } | null; users: DomainUser[]; onClose: () => void; onConfirm: (cpfs: string[]) => void; loading: boolean }) {
  const [selectedCpfs, setSelectedCpfs] = useState<string[]>([]);
  const availableUsers = users.filter(user => !property?.domainUsers.some(owner => owner.cpf === user.cpf));
  const toggle = (cpf: string) => setSelectedCpfs(current => current.includes(cpf) ? current.filter(item => item !== cpf) : [...current, cpf]);
  const close = () => { setSelectedCpfs([]); onClose(); };
  return <Dialog open={Boolean(property)} onOpenChange={next => { if (!next) close(); }}><DialogContent className="border-white/10 bg-[#082023] p-0 text-slate-100 sm:max-w-lg"><DialogHeader className="border-b border-white/10 px-6 py-6"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><Link2 className="h-5 w-5" /></div><DialogTitle className="text-2xl font-extrabold tracking-[-0.04em] text-white">Vincular coproprietários</DialogTitle><DialogDescription className="leading-6 text-slate-400">Adicione pessoas físicas já cadastradas à propriedade {property?.name}. Os vínculos existentes são preservados.</DialogDescription></DialogHeader><div className="px-6 py-6">{availableUsers.length ? <OwnerCheckboxes users={availableUsers} selectedCpfs={selectedCpfs} onToggle={toggle} /> : <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">Todos os utilizadores disponíveis já estão vinculados a esta propriedade.</p>}</div><DialogFooter className="border-t border-white/10 px-6 py-5"><Button variant="outline" onClick={close} className="border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white">Cancelar</Button><Button disabled={!selectedCpfs.length || loading} onClick={() => onConfirm(selectedCpfs)} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200">{loading ? "A vincular..." : "Vincular utilizadores"}</Button></DialogFooter></DialogContent></Dialog>;
}

function OwnerCheckboxes({ users, selectedCpfs, onToggle }: { users: DomainUser[]; selectedCpfs: string[]; onToggle: (cpf: string) => void }) { return <div className="grid gap-2">{users.map(user => <label key={user.cpf} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]"><span className="min-w-0"><span className="block truncate font-semibold text-slate-100">{user.name}</span><span className="mt-0.5 block text-xs text-slate-500">CPF {maskCpfForList(user.cpf)}</span></span><input type="checkbox" checked={selectedCpfs.includes(user.cpf)} onChange={() => onToggle(user.cpf)} className="h-4 w-4 rounded border-white/20 bg-transparent accent-cyan-300" /></label>)}</div>; }

function Field({ label, required = false, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) { return <div className={className}><Label className="mb-2 block text-xs font-bold text-slate-300">{label}{required ? <span className="ml-1 text-cyan-300">*</span> : null}</Label>{children}</div>; }
