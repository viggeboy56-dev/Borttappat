import type { Metadata } from "next";
import Link from "next/link";
import { CreateSchoolForm } from "@/components/operator/create-school-form";
import { OperatorShell } from "@/components/operator/operator-shell";
import { PageHeader } from "@/components/ui/page-header";
import { requireOperator } from "@/lib/auth/operator";
import { createClient } from "@/lib/supabase/server";

export const metadata:Metadata={title:"Skolor · Operatör"};
type School={id:string;name:string;slug:string;staff_count:number;pending_count:number;created_at:string};
export default async function OperatorSchoolsPage(){await requireOperator();const {data,error}=await (await createClient()).rpc("operator_list_schools");const schools=(data??[]) as School[];return <OperatorShell><PageHeader eyebrow="Borttappat-operatör" title="Skolor" description="Skapa pilotskolor och sköt personalens onboarding centralt."/><CreateSchoolForm/><section className="mt-7"><h2 className="mb-3 font-semibold">Onboardade skolor</h2>{error?<p role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-800">Skolorna kunde inte hämtas.</p>:schools.length===0?<p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">Inga skolor har skapats.</p>:<div className="grid gap-4 sm:grid-cols-2">{schools.map((school)=><Link key={school.id} href={`/operator/schools/${school.id}`} className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-emerald-300"><h3 className="font-semibold text-zinc-950">{school.name}</h3><p className="mt-1 text-sm text-zinc-500">{school.slug}</p><p className="mt-4 text-sm text-zinc-700">{school.staff_count} aktiva personal · {school.pending_count} väntande</p></Link>)}</div>}</section></OperatorShell>}
