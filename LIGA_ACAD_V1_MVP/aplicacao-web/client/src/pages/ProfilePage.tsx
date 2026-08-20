import { PageHeader } from "@/components/PageHeader";
import { LoadingState, QueryErrorState } from "@/components/DataFeedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BriefcaseBusiness, Check, GraduationCap, ShieldCheck, Sprout, UserCog, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const roles = [
  { value: "produtor", label: "Produtor", detail: "Acompanha os dados e resultados da própria propriedade.", icon: Sprout },
  { value: "gestor", label: "Gestor", detail: "Usa os indicadores para apoiar a gestão rural.", icon: BriefcaseBusiness },
  { value: "estudante", label: "Estudante", detail: "Consulta os módulos como apoio a estudos e diagnósticos.", icon: GraduationCap },
  { value: "consultor", label: "Consultor", detail: "Analisa propriedades e trabalhos acompanhados.", icon: UsersRound },
  { value: "administrador", label: "Administrador", detail: "Regista o perfil de administração do sistema.", icon: UserCog },
] as const;

export default function ProfilePage() {
  const { user } = useAuth();
  const profileQuery = trpc.finance.profile.get.useQuery();
  const utils = trpc.useUtils();
  const [role, setRole] = useState<(typeof roles)[number]["value"]>("produtor");
  const saveProfile = trpc.finance.profile.save.useMutation({
    onSuccess: () => { void utils.finance.profile.get.invalidate(); toast.success("Perfil atualizado."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (profileQuery.data?.profileRole) setRole(profileQuery.data.profileRole);
  }, [profileQuery.data?.profileRole]);

  if (profileQuery.isLoading) {
    return <LoadingState title="A carregar a configuração do perfil" />;
  }

  if (profileQuery.isError) {
    return <QueryErrorState onRetry={() => { void profileQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-7 sm:space-y-9">
      <PageHeader eyebrow="Identidade de uso" title="Seu perfil na Liga Rural." description="Defina a perspetiva principal de utilização da plataforma. Este perfil é informativo e pode ser atualizado quando necessário." />
      <section className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <Card className="border-white/10 bg-[#0a2023]/70 text-slate-100 shadow-[0_22px_50px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-orange-200/15 bg-orange-300/10 text-orange-200"><ShieldCheck className="h-6 w-6" /></div>
            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-orange-200">Conta autenticada</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white">{user?.name || "Utilizador"}</h2>
            <p className="mt-2 text-sm text-slate-400">{user?.email || "E-mail não disponível"}</p>
            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Perfil atual</p>
              <Badge className="mt-3 border border-cyan-200/15 bg-cyan-300/10 px-3 py-1 text-cyan-100 hover:bg-cyan-300/10">{roles.find(item => item.value === profileQuery.data?.profileRole)?.label || "Não definido"}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-[#0a2023]/70 text-slate-100 shadow-[0_22px_50px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          <CardContent className="p-6 sm:p-7">
            <h2 className="text-xl font-extrabold tracking-[-0.04em] text-white">Como você usa a plataforma?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Selecione a opção que representa melhor a sua atuação. Não altera a titularidade das propriedades nem os cálculos financeiros.</p>
            <RadioGroup value={role} onValueChange={value => setRole(value as typeof role)} className="mt-7 grid gap-3">
              {roles.map(item => {
                const Icon = item.icon;
                const active = item.value === role;
                return (
                  <label key={item.value} className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${active ? "border-cyan-200/30 bg-cyan-300/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                    <RadioGroupItem value={item.value} className="mt-1 border-slate-500 text-cyan-300" />
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? "bg-cyan-300/15 text-cyan-100" : "bg-white/[0.05] text-slate-400"}`}><Icon className="h-4 w-4" /></span>
                    <span><span className="block font-bold text-white">{item.label}</span><span className="mt-1 block text-sm leading-5 text-slate-400">{item.detail}</span></span>
                  </label>
                );
              })}
            </RadioGroup>
            <div className="mt-7 flex justify-end border-t border-white/10 pt-5"><Button onClick={() => saveProfile.mutate({ profileRole: role })} disabled={saveProfile.isPending} className="bg-cyan-300 font-bold text-[#062024] hover:bg-cyan-200"><Check className="mr-2 h-4 w-4" />{saveProfile.isPending ? "A guardar..." : "Guardar perfil"}</Button></div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
