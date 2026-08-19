import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Calculator, Landmark, LayoutDashboard, LogOut, PanelLeft, Sprout, UserRound } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/" },
  { icon: Landmark, label: "Propriedades", path: "/propriedades" },
  { icon: Calculator, label: "Fluxo de caixa", path: "/fluxo-de-caixa" },
  { icon: UserRound, label: "Meu perfil", path: "/perfil" },
];

const SIDEBAR_WIDTH_KEY = "liga-rural:sidebar-width";
const DEFAULT_WIDTH = 274;
const MIN_WIDTH = 220;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="cinematic-shell grid min-h-screen place-items-center px-5 py-10">
        <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-[#082124]/70 p-8 text-center shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-12">
          <div className="absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/25 blur-3xl" />
          <div className="relative">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-100 shadow-[0_0_30px_rgba(103,232,249,0.16)]">
              <Sprout className="h-7 w-7" />
            </div>
            <p className="mt-7 text-[11px] font-extrabold uppercase tracking-[0.28em] text-cyan-300">Liga Rural</p>
            <h1 className="mx-auto mt-4 max-w-md text-4xl font-extrabold tracking-[-0.065em] text-white sm:text-5xl">A clareza que faz a gestão crescer.</h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-slate-300">Entre para organizar receitas, custos e resultados da sua propriedade em uma visão financeira objetiva.</p>
            <Button onClick={() => startLogin()} className="mt-8 h-12 min-w-52 bg-orange-400 px-6 font-bold text-[#1a100b] hover:bg-orange-300">Entrar na plataforma</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find(item => item.path === location);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const nextWidth = event.clientX - sidebarLeft;
      if (nextWidth >= MIN_WIDTH && nextWidth <= MAX_WIDTH) setSidebarWidth(nextWidth);
    };
    const stop = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <div className="cinematic-shell flex min-h-screen w-full">
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#06191d]/88 text-slate-200 backdrop-blur-2xl">
          <SidebarHeader className="h-20 justify-center border-b border-white/10 px-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <button onClick={() => document.querySelector<HTMLButtonElement>("[data-sidebar=trigger]")?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                <PanelLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-extrabold tracking-[0.12em] text-white">LIGA RURAL</p>
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Gestão financeira</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="pt-5">
            <p className="px-5 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 group-data-[collapsible=icon]:hidden">Operação</p>
            <SidebarMenu className="gap-1 px-3">
              {menuItems.map(item => {
                const isActive = item.path === location;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-11 rounded-xl px-3 text-slate-400 transition hover:bg-white/[0.07] hover:text-white data-[active=true]:bg-cyan-300/12 data-[active=true]:text-cyan-100 ${isActive ? "font-bold" : "font-medium"}`}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-white/10 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <Avatar className="h-9 w-9 shrink-0 border border-orange-200/20 bg-orange-300/10">
                    <AvatarFallback className="bg-transparent text-xs font-bold text-orange-100">{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-semibold text-white">{user?.name || "Utilizador"}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email || "Conta autenticada"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#0b2024] text-slate-100">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-orange-200 focus:bg-orange-300/10 focus:text-orange-100">
                  <LogOut className="mr-2 h-4 w-4" /> Terminar sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="absolute right-0 top-0 z-50 hidden h-full w-1 cursor-col-resize bg-transparent hover:bg-cyan-300/20 md:block" onMouseDown={() => setIsResizing(true)} />
      </div>
      <SidebarInset className="relative min-w-0 bg-transparent">
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/10 bg-[#06191d]/80 px-4 backdrop-blur-xl">
            <SidebarTrigger data-sidebar="trigger" className="border border-white/10 bg-white/[0.05] text-cyan-100 hover:bg-white/[0.1] hover:text-white" />
            <span className="text-sm font-bold text-white">{activeMenuItem?.label ?? "Liga Rural"}</span>
          </div>
        ) : <SidebarTrigger data-sidebar="trigger" className="hidden" />}
        <main className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">{children}</main>
      </SidebarInset>
    </div>
  );
}
