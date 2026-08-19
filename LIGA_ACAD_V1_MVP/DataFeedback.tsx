import { Button } from "@/components/ui/button";
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";

export function LoadingState({ title = "A preparar informações" }: { title?: string }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border border-white/10 bg-[#0a2023]/60 p-8 text-center backdrop-blur-xl">
      <div>
        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-cyan-200" />
        <p className="mt-4 text-sm font-bold text-white">{title}</p>
        <p className="mt-2 text-sm text-slate-500">Isso deve levar apenas alguns instantes.</p>
      </div>
    </div>
  );
}

export function QueryErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border border-orange-200/15 bg-orange-300/[0.045] p-8 text-center backdrop-blur-xl">
      <div className="max-w-md">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-orange-200/15 bg-orange-300/10 text-orange-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-5 text-lg font-extrabold text-white">Não foi possível carregar estes dados</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Verifique a sua ligação e tente novamente. Nenhum dado registado foi alterado.</p>
        <Button onClick={onRetry} variant="outline" className="mt-6 border-orange-200/20 bg-transparent text-orange-100 hover:bg-orange-300/10 hover:text-white">
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    </div>
  );
}
