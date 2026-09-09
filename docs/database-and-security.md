# Databas och säkerhet

Det här dokumentet beskriver fas 2-grunden. Fas 3 använder `profiles` och `schools` för serverbaserad åtkomstkontroll, fas 4 använder samma RLS-regler för hittegodskatalogen och privata bilder, och fas 5 utökar skyddet med transaktioner för anspråk och utlämning.

## Säkerhetsmodell

Varje tenant är en rad i `schools`. Användarens tenant och roll hämtas alltid från `profiles` med `auth.uid()`; ett `school_id` från webbläsaren räcker aldrig för åtkomst.

RLS-hjälpfunktionerna ligger i det icke-exponerade schemat `private`, körs som `SECURITY DEFINER` med tom `search_path` och får bara returnera den inloggade användarens egen skola eller roll. Det bryter den annars rekursiva kedjan när en policy på `profiles` behöver läsa `profiles`.

RLS kombineras med kolumnspecifika grants och integritetstriggers:

- en profil kan inte byta `school_id` eller `id`;
- en vanlig medlem kan inte ändra sin roll;
- ett föremål kan inte flyttas till en annan skola eller få en ny skapare;
- ett anspråk kan inte flyttas till ett annat föremål eller en annan användare;
- endast anspråkets status kan ändras vid granskning, medan granskare och tid sätts i databasen.

Secret-nyckeln (eller den äldre service-role-nyckeln) kringgår RLS. Den får endast användas i betrodda lokala scripts eller servermiljöer och får aldrig få prefixet `NEXT_PUBLIC_`.

## Skapa och anslut ett Supabase-projekt

1. Skapa ett separat utvecklingsprojekt i Supabase Dashboard.
2. Supabase CLI finns installerat lokalt i projektet. Kör det med `pnpm supabase`.
3. Projektets lokala CLI-konfiguration finns i `supabase/config.toml`.
4. Autentisera: `pnpm supabase login`.
5. Koppla repositoryt: `pnpm supabase link --project-ref <project-ref>`.
6. Kontrollera migreringen: `pnpm supabase db push --dry-run`.
7. Applicera den: `pnpm supabase db push`.

Kör inte `supabase db reset --linked` mot produktion. Det kommandot raderar data.

## Miljövariabler för webbappen

Kopiera `.env.example` till `.env.local` och fyll i värden från projektets Connect-dialog:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

En publishable key är avsedd för klienten; dataskyddet måste därför alltid komma från RLS. Lägg aldrig service-role-nyckeln i `.env.local` med ett publikt variabelnamn.

## Utvecklingsanvändare och demodata

Seed-scriptet är endast avsett för ett separat lokalt eller hostat utvecklingsprojekt.

1. Applicera migreringen först.
2. Kopiera `.env.seed.example` till `.env.seed.local`.
3. Lägg in utvecklingsprojektets URL, en secret key och tre unika starka lösenord.
4. Kör `pnpm seed:demo`.
5. Ta bort `.env.seed.local` när den inte längre behövs eller förvara den i en godkänd lokal secret manager.

Scriptet skapar en demoskola, rollerna `school_admin`, `staff` och `member` samt tre föremål. Lösenord skrivs inte ut och finns aldrig i repositoryt. Kör aldrig seed-scriptet mot produktion.

## Privat lagring av föremålsbilder

Migreringen skapar den privata bucketen `item-images`, begränsad till JPEG, PNG och WebP samt högst 5 MB per fil.

Objektnamn måste följa:

```text
<school_id>/<item_id>/<unikt-filnamn>.<filändelse>
```

Endast personal och skoladministratörer kan skriva filer, och både skolmappen och föremålsmappen verifieras mot databasen. En medlem kan bara läsa en bild när motsvarande föremål i den egna skolan har status `available`. Spara hela den relativa sökvägen i `items.image_path`; använd aldrig en publik bucket för dessa bilder.

## Verifiera RLS

Med Docker igång och Supabase CLI installerad:

```bash
pnpm supabase start
pnpm supabase db reset
pnpm supabase test db
```

Testet i `supabase/tests/database/rls.test.sql` använder två skolor och kör frågor som autentiserad medlem, personal och administratör. Det kontrollerar bland annat att:

- School A inte kan läsa eller uppdatera School B:s föremål;
- School A inte kan läsa School B:s anspråk;
- en medlem endast ser tillgängliga föremål i sin egen skola;
- en medlem inte kan skapa eller uppdatera föremål;
- personal och skoladministratör kan skapa föremål i sin egen skola;
- ett skapat föremål behåller rätt skola och skapare;
- en användare inte kan läsa en annan skolas privata föremålsbild;
- en medlem inte kan skapa ett anspråk på en annan skolas föremål;
- en medlem inte kan höja sin egen roll;
- en skoladministratör kan hantera roller inom sin egen skola.

Gör samma kontroll manuellt i ett separat utvecklingsprojekt genom att logga in som respektive demokonto och använda publishable key. Testa aldrig RLS med en secret- eller service-role-nyckel eftersom den avsiktligt kringgår policies.

## Migreringsfiler

- `supabase/migrations/20260908190000_phase_2_database_foundation.sql` – schema, integritet, RLS och Storage.
- `supabase/tests/database/rls.test.sql` – isolerings- och privilegietester.
- `scripts/seed-demo.mjs` – explicit development seed med credentials från lokal miljö.
