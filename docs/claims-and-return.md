# Anspråk och utlämning

Fas 5 lägger till ett komplett grundflöde från en medlems ägaranspråk till personalens beslut och bekräftad utlämning. Ingen del av flödet tar användar-ID, roll eller skola från formuläret. De värdena hämtas från den autentiserade Supabase-sessionen och användarens profil.

## Medlemsflöde

En medlem öppnar ett tillgängligt föremål och väljer **Det här är mitt**. Beskrivningen ska innehålla ett kännetecken som personalen kan kontrollera och får vara högst 2 000 tecken. Ett väntande anspråk per medlem och föremål tillåts.

På `/dashboard/my-claims` ser medlemmen endast sina egna anspråk och deras status:

- **Väntar på granskning**
- **Godkänt**
- **Avslaget**

RLS gör att medlemmen inte kan läsa någon annans beskrivning eller anspråk. När ett föremål har reserverats eller lämnats ut kan den medlem som själv gjort anspråk fortfarande se föremålet och sin historik.

## Personalens granskning

`staff` och `school_admin` använder `/dashboard/claims`. Där visas endast anspråk på den egna skolans föremål. Ett väntande anspråk kan godkännas eller avslås efter en bekräftelse.

Godkännande sker i en enda databastransaktion:

1. föremålet låses så att två samtidiga beslut inte kan vinna;
2. valt anspråk markeras som godkänt;
3. föremålet markeras som reserverat för ägaren;
4. övriga väntande anspråk på samma föremål avslås.

Databasen har dessutom unika index som garanterar högst ett godkänt anspråk per föremål. Ett avslag ändrar inte föremålets tillgänglighet.

När ett reserverat föremål verkligen har hämtats väljer personalen **Markera som utlämnat**. Historiken och det godkända anspråket sparas.

## Säkerhet

- Anspråk skapas genom `submit_claim`, som använder `auth.uid()` och användarens serverlagrade profil.
- Beslut görs genom `review_claim` och utlämning genom `mark_item_returned`.
- Direkta insert/update-anrop på `claims` är borttagna för vanliga autentiserade användare.
- RLS begränsar alla läsningar till rätt skola och rätt roll.
- Den privata bildbucketens policy följer samma regler.
- Secret key används bara av lokala seed- och verifieringsskript och får aldrig skickas till webbläsaren.

## Kontroller

Kör kod- och enhetstester:

```powershell
pnpm lint
pnpm typecheck
pnpm test:auth
pnpm test:items
pnpm test:claims
pnpm build
```

Kör databasens RLS- och livscykeltester lokalt:

```powershell
.\node_modules\.bin\supabase.cmd test db
```

Med appen på port 3000 och de Git-ignorerade `.env.local` samt `.env.seed.local` konfigurerade kan det verkliga demoflödet verifieras med:

```powershell
pnpm verify:phase5
```

Demokonton och lokala lösenord hanteras enligt [Autentisering och åtkomst](authentication-and-access.md). Inga lösenord ska läggas i dokumentationen eller versionshanteringen.
