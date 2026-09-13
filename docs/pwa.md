# PWA-stöd

Borttappat använder Next.js inbyggda stöd för webbmanifest och metadata. Appen kan installeras från Safari på iPhone och Chrome på Android och startar då i fristående läge.

## Ikon och färger

Den nuvarande appikonen är en enkel version av den befintliga Borttappat-symbolen: ett vitt **B** på produktens mörkgröna bakgrund. Vanliga ikoner skapas i 192 × 192 och 512 × 512 pixlar. En separat maskbar 512 × 512-variant håller symbolen inom Androids säkra yta. iPhone får en särskild 180 × 180 Apple touch-ikon.

## Service worker och data

Service workern används bara för installation och aktivering. Den fångar inga nätverksanrop och har ingen cache. Autentiserade sidor, bilder, skoldata, formulär och uppladdningar sparas därför inte för offlinebruk och kan inte blandas mellan användare via en PWA-cache.

Appen kräver internetanslutning. Offline-skrivningar, köade anspråk och köade bilduppladdningar stöds inte.

## Manuell kontroll

- iPhone: öppna produktionsadressen i Safari, tryck Dela och välj **Lägg till på hemskärmen**.
- Android: öppna produktionsadressen i Chrome, öppna menyn och välj **Installera app** eller **Lägg till på startskärmen**.
- Starta ikonen från hemskärmen och kontrollera att appen öppnas utan vanlig webbläsarrad.
- Kontrollera inloggning, kvarstående session, navigering, kamera/bilduppladdning, registrering och anspråksflöde för relevanta roller.
- Kontrollera operatörsinloggningen separat.
