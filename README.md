# Borttappat!

Digitalt hittegods för skolor. Projektet är ett MVP byggt med Next.js 16, TypeScript, Tailwind CSS och Supabase.

## Lokal utveckling

1. Kopiera `.env.example` till `.env.local`.
2. Fyll i projektets URL och publishable key från Supabase.
3. Installera och starta projektet:

```bash
pnpm install
pnpm dev
```

Öppna sedan [http://localhost:3000](http://localhost:3000).

## Struktur

- `src/app` – routes och layouts med App Router
- `src/components` – återanvändbara layout- och UI-komponenter
- `src/lib/supabase` – klienter för browser, server och session proxy

Fas 1 innehåller grundstruktur och applikationsskal. Fas 2 lägger till ett versionsstyrt databasschema, tenant-isolerande RLS, en privat Storage-bucket, säker utvecklingsseed och databastester. Fas 3 lägger till e-postinloggning, cookie-baserade Supabase-sessioner, serverhämtade profiler och rollskyddade routes. Fas 4 innehåller den sökbara hittegodskatalogen, detaljsidor och säker registrering med privata bilder. Fas 5 innehåller ägaranspråk, personalgranskning, reservation och bekräftad utlämning. Fas 6 innehåller global operatörsbehörighet, operatörsstyrd skolstart, säker bulk-onboarding och individuella personalinbjudningar. Betalningar och notifieringar ingår inte.

Se [Databas och säkerhet](docs/database-and-security.md) för migrering, lokala utvecklingsanvändare och RLS-verifiering.

Se [Autentisering och åtkomst](docs/authentication-and-access.md) för inloggning, miljövariabler, demokonton och rollmatris.

Se [Hittegods och bilder](docs/items-and-storage.md) för katalogen, publiceringsflödet, bildsäkerheten och manuell testning.

Se [Anspråk och utlämning](docs/claims-and-return.md) för medlemsflödet, personalens granskning, transaktionerna och testerna.

Se [Operatörsstyrd onboarding](docs/administration-and-invitations.md) för operatörsbehörighet, skolskapande, bulkimport och personalens individuella engångslänkar.
