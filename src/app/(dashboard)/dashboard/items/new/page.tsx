import type { Metadata } from "next";
import Link from "next/link";
import { NewItemForm } from "@/components/items/new-item-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireRouteAccess } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Registrera fynd" };

export default async function NewItemPage() {
  await requireRouteAccess("/dashboard/items/new");
  return (
    <>
      <Link href="/dashboard/items" className="mb-5 inline-flex min-h-10 items-center text-sm font-medium text-zinc-600 hover:text-zinc-950">← Tillbaka till hittegods</Link>
      <PageHeader title="Registrera fynd" description="Fotografera saken och fyll i det ni vet. Fyndet blir synligt för skolans medlemmar direkt när det publiceras." />
      <NewItemForm />
    </>
  );
}
