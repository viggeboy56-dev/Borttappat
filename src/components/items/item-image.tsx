import Image from "next/image";

export function ItemImage({
  url,
  alt,
  priority = false,
}: {
  url: string | null;
  alt: string;
  priority?: boolean;
}) {
  if (!url) {
    return (
      <div className="grid size-full place-items-center bg-zinc-100 text-zinc-400" role="img" aria-label="Ingen bild tillgänglig">
        <svg className="size-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
          <path d="m4 17 4.5-4.5 3 3 2-2L20 19" />
        </svg>
      </div>
    );
  }

  return <Image src={url} alt={alt} fill priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />;
}
