import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {Brand} from "@/components/brand";
import {MemberJoinForm} from "@/components/member-onboarding/member-join-form";
import {getAuthState} from "@/lib/auth/server";
import {normalizeMemberJoinSlug} from "@/lib/member-onboarding/code";
import {createClient} from "@/lib/supabase/server";

export const metadata:Metadata={title:"Gå med i din skola"};
type School={school_name:string;school_slug:string;joining_enabled:boolean};
export default async function MemberJoinPage({params}:{params:Promise<{slug:string}>}){const {slug:rawSlug}=await params;const slug=normalizeMemberJoinSlug(rawSlug);if(!slug)notFound();const {data,error}=await (await createClient()).rpc("resolve_member_join_school",{p_school_slug:slug});const school=((data??[])[0]??null) as School|null;if(error||!school)notFound();const state=await getAuthState();return <main className="min-h-screen bg-[#f7f7f5] px-5 py-8 sm:py-14"><section className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><Brand href={`/join/${slug}`}/><p className="mt-10 text-sm font-semibold text-emerald-800">Medlemsanslutning</p><h1 className="mt-2 text-2xl font-bold tracking-tight">Gå med i {school.school_name}</h1>{school.joining_enabled?<><p className="mt-3 text-sm leading-6 text-zinc-600">Ange skolkoden du fått från skolan. Du hamnar automatiskt på rätt skola som medlem.</p><MemberJoinForm slug={slug} signedIn={state.status!=="unauthenticated"}/></>:<p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900">Skolan tar inte emot nya medlemmar just nu. Kontakta skolan om du behöver hjälp.</p>}</section></main>}
