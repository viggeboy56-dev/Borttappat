import Image from "next/image";
import Link from "next/link";

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-emerald-700" aria-label="Borttappat – startsida">
      <Image
        src="/brand/borttappat-mark.png"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0"
      />
      <span className="text-xl font-bold tracking-tight text-zinc-950">Borttappat<span className="text-emerald-700">!</span></span>
    </Link>
  );
}
