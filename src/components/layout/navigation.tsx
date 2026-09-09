"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/auth/access";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "home", roles: ["school_admin", "staff", "member"] },
  { href: "/dashboard/items", label: "Hittegods", icon: "items", roles: ["school_admin", "staff", "member"] },
  { href: "/dashboard/my-claims", label: "Mina anspråk", icon: "claims", roles: ["member"] },
  { href: "/dashboard/items/new", label: "Registrera fynd", icon: "new", roles: ["school_admin", "staff"] },
  { href: "/dashboard/claims", label: "Anspråk", icon: "claims", roles: ["school_admin", "staff"] },
  { href: "/dashboard/admin", label: "Administration", icon: "admin", roles: ["school_admin"] },
] as const;

type IconName = (typeof links)[number]["icon"];

function NavIcon({ name }: { name: IconName }) {
  if (name === "home") return <path d="M3 10.75 12 3l9 7.75V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.75Z" />;
  if (name === "items") return <><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" /><path d="m4 12 8 4.5 8-4.5M4 16.5 12 21l8-4.5" /></>;
  if (name === "new") return <><path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" /><path d="M12 12v9M7.5 16.5h9" /></>;
  if (name === "claims") return <><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="m8 12 2.5 2.5L16 9" /></>;
  return <><circle cx="12" cy="8" r="3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2M19 5v6M16 8h6" /></>;
}

export function Navigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const visibleLinks = links.filter((link) => (link.roles as readonly UserRole[]).includes(role));

  return (
    <nav aria-label="Huvudmeny" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {visibleLinks.map((link) => {
        const isActive =
          link.href === "/dashboard" || link.href === "/dashboard/items"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link key={link.href} href={link.href} aria-current={isActive ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 ${isActive ? "bg-emerald-50 text-emerald-900" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"}`}>
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <NavIcon name={link.icon} />
            </svg>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
