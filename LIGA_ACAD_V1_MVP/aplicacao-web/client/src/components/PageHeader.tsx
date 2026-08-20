import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end">
      <div className="max-w-2xl">
        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.055em] text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
