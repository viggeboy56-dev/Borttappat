import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { href: string; label: string };
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-14 text-center sm:px-8">
      <div className="mx-auto grid size-11 place-items-center rounded-lg bg-emerald-50 text-emerald-800" aria-hidden="true">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M11 8v6M8 11h6" />
        </svg>
      </div>
      <h2 className="mt-4 text-base font-semibold text-zinc-950">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-zinc-600">{description}</p>
      {action && <Link href={action.href} className="mt-5 inline-flex rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700">{action.label}</Link>}
    </div>
  );
}
