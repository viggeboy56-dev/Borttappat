import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

export function OperatorShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#f7f7f5]"><header className="border-b border-zinc-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Brand href="/operator/schools" /><div className="flex items-center gap-4"><span className="hidden text-sm font-semibold text-emerald-900 sm:inline">Operatör</span><form action="/auth/signout" method="post"><button className="min-h-10 rounded-lg border border-zinc-300 px-3 text-sm font-semibold">Logga ut</button></form></div></div></header><main className="mx-auto max-w-6xl px-5 py-8">{children}</main></div>;
}
