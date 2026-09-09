# Autentisering och åtkomst

Phase 3 använder Supabase Auth med e-post och lösenord samt `@supabase/ssr` för cookie-baserade sessioner i Next.js App Router.

## Miljövariabler

Kopiera `.env.example` till `.env.local` och hämta följande värden från Supabase-projektets **Connect**-dialog:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Starta om utvecklingsservern efter ändringen. En publishable key är avsedd för webbläsaren och ger inte förhöjd åtkomst; RLS skyddar databasen. Lägg aldrig en service-role-nyckel i en `NEXT_PUBLIC_`-variabel.

## Så fungerar inloggningen

`/login` använder `signInWithPassword`. Supabase SSR lagrar och uppdaterar sessionen i cookies. Next.js-proxyn anropar `getClaims()` för att verifiera token och uppdatera cookies innan serverkomponenterna körs. Serverkod använder inte `getSession()` som underlag för åtkomstbeslut.

Dashboardlayouten verifierar användaren igen på servern och hämtar `full_name`, `school_id`, `role` och skolans namn från `profiles` och `schools`. Roll eller skol-id från formulär, URL, local storage eller annan klientstate används aldrig för behörighet.

En autentiserad användare utan komplett profil skickas till `/onboarding`. Där visas ingen skoldata. Profilen måste skapas eller rättas av en betrodd administratör eller utvecklingsprocess.

Utloggning sker genom `POST /auth/signout`, rensar Supabase-sessionen och skickar användaren till `/login`.

## Rollåtkomst

| Route | member | staff | school_admin |
| --- | --- | --- | --- |
| `/dashboard` | Ja | Ja | Ja |
| `/dashboard/items` | Ja | Ja | Ja |
| `/dashboard/items/new` | Nej | Ja | Ja |
| `/dashboard/claims` | Nej | Ja | Ja |
| `/dashboard/admin` | Nej | Nej | Ja |

Navigationen döljer otillåtna länkar, men varje begränsad route anropar också den serverbaserade åtkomstkontrollen. Databasens RLS är det sista skyddslagret för all tenantdata.

## Skapa demokonton

Det befintliga scriptet `scripts/seed-demo.mjs` skapar en demoskola och ett konto för varje roll:

- `admin@demo.borttappat.invalid` – `school_admin`
- `personal@demo.borttappat.invalid` – `staff`
- `medlem@demo.borttappat.invalid` – `member`

Kopiera `.env.seed.example` till `.env.seed.local`. Fyll endast den lokala, Git-ignorerade filen med utvecklingsprojektets URL, en server-side secret key (`sb_secret_...`) och tre egna starka lösenord. Kör sedan:

```powershell
pnpm seed:demo
```

Lösenorden hårdkodas eller skrivs aldrig ut. Kör scriptet endast mot ett utvecklingsprojekt. Om `pnpm` inte finns i ditt vanliga PowerShell kan projektets scripts köras från Codex-terminalen, eller efter att Node/pnpm lagts till i PATH.

## Kontroller

Rollmatrisen kan testas utan nätverk:

```powershell
pnpm test:auth
```

RLS-testet körs separat med `pnpm supabase test db`. Båda behövs: routetestet verifierar serverns navigationsbeslut och pgTAP verifierar att databasen fortfarande isolerar tenants även om en route skulle anropas felaktigt.
