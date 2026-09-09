import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requireRouteAccess } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  await requireRouteAccess("/dashboard/admin");

  return (
    <>
      <PageHeader title="Administration" description="Skolans inställningar och användare kommer att hanteras här." />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Skoluppgifter", "Namn, kontaktuppgifter och skolans profil."],
          ["Användare och roller", "Administratörer, personal och medlemmar."],
        ].map(([title, description]) => (
          <article key={title} className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="font-semibold text-zinc-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Kommer senare</p>
          </article>
        ))}
      </div>
    </>
  );
}
