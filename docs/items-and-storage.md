# Hittegods och bilder

Phase 4 gör det möjligt för personal och skoladministratörer att registrera fynd med bild. Alla roller kan söka i sin egen skolas katalog och öppna en detaljsida. Anspråk och utlämning beskrivs i [Anspråk och utlämning](claims-and-return.md).

## Katalogen

`/dashboard/items` läser föremål med den inloggade användarens vanliga Supabase-session. Ingen klientparameter används för att välja skola. RLS avgör vilka rader som returneras:

- `member` ser endast `available` i sin egen skola;
- `staff` och `school_admin` ser alla statusar i sin egen skola;
- ingen roll kan läsa en annan skolas föremål.

Sökningen matchar rubrik. Kategori kan filtreras med de fördefinierade kategorierna. Personal och administratörer får även statusfilter. `/dashboard/items/[id]` använder samma RLS-skydd; ett otillåtet eller okänt id visas som ej tillgängligt utan att avslöja om posten finns.

## Registrera ett fynd

`/dashboard/items/new` är serverbegränsad till `staff` och `school_admin`. Formuläret skickar metadata och bild till `POST /api/items`. Endpointen verifierar session och profil på servern och hämtar `school_id`, `created_by` och roll därifrån. Dessa värden tas aldrig från redigerbara formulärfält.

Servern validerar obligatoriska fält, kategori, datum, bildformat och bildstorlek. Den skapar först en arkiverad intern post, laddar upp bilden och publicerar sedan posten som `available`. Därmed blir en ofullständig uppladdning inte synlig för medlemmar.

Tillåtna bilder:

- JPEG
- PNG
- WebP
- högst 5 MB

Mobilens bakre kamera föreslås genom filfältets `capture="environment"` när webbläsaren stöder det. Ingen extern bildbehandlingsdependency används.

## Privat bildsäkerhet

Bucketen `item-images` är privat. `items.image_path` innehåller endast en relativ sökväg:

```text
<school_id>/<item_id>/<slumpmässigt-filnamn>.<filändelse>
```

Storage RLS verifierar den autentiserade användarens skola, roll, föremål och status. Katalogen och detaljsidan skapar kortlivade signerade URL:er på servern med användarens session. Inga publika permanenta URL:er sparas i databasen och någon från Skola A kan inte skapa en signerad länk till Skola B:s objekt.

## Kontroller

Kör lokala kontroller:

```powershell
pnpm lint
pnpm typecheck
pnpm test:auth
pnpm test:items
pnpm build
.\node_modules\.bin\supabase.cmd test db
```

Det verkliga demoflödet kräver att den lokala appen körs på port 3000 och att `.env.local` samt `.env.seed.local` är ifyllda:

```powershell
pnpm verify:phase4
```

Kontrollen loggar in som demo-personal, publicerar ett PNG-fynd genom appens endpoint, verifierar serverbestämt ägarskap, loggar in som demo-medlem, läser katalog och detaljsida, hämtar den privata bilden samt kontrollerar att medlemmen nekas skapande och registreringssidan.

## Manuell testning

1. Starta appen med `pnpm dev` och öppna `http://localhost:3000/login`.
2. Logga in som `personal@demo.borttappat.invalid` med det lokala demolösenordet.
3. Välj **Registrera fynd**, ta eller välj en bild och publicera.
4. Kontrollera katalogen och öppna fyndets detaljsida.
5. Logga ut och logga in som `medlem@demo.borttappat.invalid`.
6. Kontrollera att samma fynd och bild visas och att registreringslänken saknas.
7. Prova sökning och kategorifilter.

Lösenord och secret key ska bara finnas i de Git-ignorerade lokala miljöfilerna och får inte läggas i dokumentation eller versionshantering.
