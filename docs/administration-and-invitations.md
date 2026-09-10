# Operatörsstyrd skol- och personalonboarding

Fas 6 följer pilotlöftet: **Skicka oss personalens mejladresser så sköter vi resten.** Skolan behöver inte skapa konton, välja roller eller administrera personalinbjudningar.

## Roller och operatör

`school_admin`, `staff` och `member` är roller inne i en skolas tenant. De ger aldrig global åtkomst. En Borttappat-operatör är i stället en separat post i `private.platform_operators`, kopplad till ett befintligt Supabase Auth-konto.

Operatörsstatus kan inte väljas vid registrering. Ett Auth-konto godkänns manuellt med secret key från en betrodd dator:

```powershell
pnpm operator:grant -- --email "operator@borttappat.se"
```

Kommandot läser `.env.seed.local`, som aldrig får versionshanteras. Därefter loggar operatören in på `/operator/login`. Varje operatörssida och API-route kontrollerar behörigheten server-side, och databasfunktionerna gör samma kontroll igen.

## Skolskapande och bulkimport

Operatören skapar skolan under `/operator/schools` och öppnar sedan skolans sida. Personallistan klistras in med en person per rad:

```text
Anna Andersson, anna@skola.se
Erik Eriksson, erik@skola.se
```

Klienten och servern normaliserar namn och e-post. Förhandsgranskningen visar ogiltiga rader, dubbletter, befintliga skolprofiler och aktiva inbjudningar. Ett befintligt Auth-konto utan skolprofil kan bjudas in och loggar då in i stället för att skapa ett nytt konto.

Skapandet är atomiskt. Databasen validerar hela listan igen innan den första raden sparas. Om en rad är ogiltig, konflikter uppstår eller en insert misslyckas återställs hela batchen.

## Individuella inbjudningar

Varje person får ett eget slumpmässigt 32-byte-token. Bara SHA-256-hashen lagras. Namn, e-post, skola och rollen `staff` lagras server-side; webbläsaren kan inte välja roll eller skola. Länken gäller i sju dagar och visas bara i svaret från den första skapningen.

Om en länk försvinner kan operatören återutfärda inbjudan. Då ersätts hash och utgångstid, den gamla länken blir omedelbart ogiltig och den nya råa länken visas en gång. Accepterade inbjudningar kan inte återutfärdas.

Operatören kan även avbryta en väntande inbjudan och ser väntande, accepterade, utgångna och avbrutna inbjudningar per skola.

## Konto och lösenord

Personal öppnar sin individuella länk, ser namn och skola och skapar sitt eget lösenord. Ett befintligt konto kan logga in. Acceptansfunktionen låser inbjudningsraden, kontrollerar tokenstatus och e-post, skapar profilen från inbjudningens serverlagrade värden och markerar inbjudan accepterad i samma transaktion.

Utgångna, avbrutna och redan använda länkar nekas. Ett konto med profil i en annan skola flyttas aldrig.

## School admin

`school_admin` är en äldre skolnivåroll som fortfarande kan användas av Phase 1–5. Rollen är inte en Borttappat-operatör. Skolans administrationsyta är skrivskyddad: den kan visa den egna skolans användare och onboardingstatus men kan inte skapa personalinbjudningar eller ändra personalroller.

## Säkerhet

- Operatörstabellen ligger i privat schema utan klientprivilegier.
- Globala åtgärder går genom smala `SECURITY DEFINER`-funktioner med obligatorisk operatörskontroll.
- Vanliga autentiserade användare kan inte skapa skolor, importera personal eller skriva till inbjudningstabellen.
- Skolans befintliga RLS och tenantgränser är oförändrade.
- Inbjudningar har globalt unik aktiv e-post för att undvika samtidiga tenantkonflikter.
- Råa tokenvärden sparas aldrig.

## Pilotbegränsningar

Inbjudningslänkar kopieras och skickas manuellt av operatören. Automatisk e-postleverans, publik skolregistrering, SSO, kommunadministration och produktiondriftsättning ingår inte i fas 6.

Migreringen ska verifieras lokalt och får inte appliceras i det länkade utvecklingsprojektet utan ett separat godkännande.
