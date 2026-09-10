"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const tabs = [["/dashboard/admin", "Översikt"], ["/dashboard/admin/users", "Användare"], ["/dashboard/admin/invitations", "Onboardingstatus"]] as const;
export function AdminTabs() { const path=usePathname(); return <nav aria-label="Administrationsmeny" className="mb-7 flex gap-2 overflow-x-auto border-b border-zinc-200">{tabs.map(([href,label]) => { const active=path===href; return <Link key={href} href={href} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${active ? "border-emerald-700 text-emerald-900" : "border-transparent text-zinc-600 hover:text-zinc-950"}`}>{label}</Link>; })}</nav>; }
