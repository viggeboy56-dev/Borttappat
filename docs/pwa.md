# PWA-stöd

Borttappat använder Next.js inbyggda stöd för webbmanifest och metadata. Appen kan installeras från Safari på iPhone och Chrome på Android och startar då i fristående läge.

## Ikon och färger

Appikonen använder den officiella Borttappat-symbolen från Illustrator-originalet `borttappad logotyp2.ai`: en vit kartnål med förstoringsglas och mörkgrön skugga på originalets gröna bakgrund. Vanliga ikoner finns i 192 × 192 och 512 × 512 pixlar. En separat maskbar 512 × 512-variant ger originalsymbolen större säkerhetsmarginal för Android. iPhone får en särskild 180 × 180 Apple touch-ikon med samma säkerhetsmarginal.

Illustrator-originalets SHA-256 vid exporten var `4657A066E5D6FE5A2EB4679DAA5190D51C9EF04966EF2111120E3EB44956FFB8`. Symbolens proportioner, färger och detaljer har inte ritats om; endast beskärning med jämn säkerhetsmarginal och skalning till respektive webbformat har gjorts.

## Service worker och data

Service workern används bara för installation och aktivering. Den fångar inga nätverksanrop och har ingen cache. Autentiserade sidor, bilder, skoldata, formulär och uppladdningar sparas därför inte för offlinebruk och kan inte blandas mellan användare via en PWA-cache.

Appen kräver internetanslutning. Offline-skrivningar, köade anspråk och köade bilduppladdningar stöds inte.

## Manuell kontroll

- iPhone: öppna produktionsadressen i Safari, tryck Dela och välj **Lägg till på hemskärmen**.
- Android: öppna produktionsadressen i Chrome, öppna menyn och välj **Installera app** eller **Lägg till på startskärmen**.
- Starta ikonen från hemskärmen och kontrollera att appen öppnas utan vanlig webbläsarrad.
- Kontrollera inloggning, kvarstående session, navigering, kamera/bilduppladdning, registrering och anspråksflöde för relevanta roller.
- Kontrollera operatörsinloggningen separat.
