import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { OperatorLoginForm } from "@/components/operator/operator-login-form";
import { getOperatorState } from "@/lib/auth/operator";

export const metadata:Metadata={title:"Operatörsinloggning"};
export default async function OperatorLoginPage(){const state=await getOperatorState();if(state.status==="authorized")redirect("/operator/schools");return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5"><section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-7"><Brand href="/operator/login"/><p className="mt-10 text-sm font-semibold text-emerald-800">Intern åtkomst</p><h1 className="mt-2 text-2xl font-bold">Borttappat-operatör</h1><p className="mt-2 text-sm leading-6 text-zinc-600">Endast godkända plattformsoperatörer har åtkomst.</p><OperatorLoginForm/></section></main>}
