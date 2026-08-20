import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  accent: "cyan" | "orange" | "lime";
};

const accents = {
  cyan: "from-cyan-300/30 via-cyan-300/5 to-transparent text-cyan-200 ring-cyan-200/15",
  orange: "from-orange-300/35 via-orange-300/5 to-transparent text-orange-200 ring-orange-200/15",
  lime: "from-lime-300/30 via-lime-300/5 to-transparent text-lime-200 ring-lime-200/15",
};

export function MetricCard({ label, value, description, icon: Icon, accent }: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a2023]/70 p-5 shadow-[0_22px_50px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-white/20">
      <div className={`absolute inset-0 bg-gradient-to-br ${accents[accent]} opacity-80`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-4 text-2xl font-extrabold tracking-[-0.04em] text-white sm:text-3xl">{value}</p>
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}
