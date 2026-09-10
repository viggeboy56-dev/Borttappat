# Produktion på Vercel

Fas 7 använder samma länkade Supabase-projekt som piloten och Vercels vanliga Next.js-stöd. Ingen `vercel.json` eller egen output-konfiguration behövs.

## Miljövariabler

Lägg följande variabler i Vercel för **Production**:

- `NEXT_PUBLIC_SUPABASE_URL` – projektets URL från Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` – projektets publishable key.

Båda är avsedda för webbläsaren. Åtkomst till data begränsas av autentisering och RLS.

Lägg **inte** in `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_ADMIN_PASSWORD`, `DEMO_STAFF_PASSWORD` eller `DEMO_MEMBER_PASSWORD` i Vercel. De används inte av webbappen och ska stanna på betrodda utvecklingsdatorer.

Lokala `.env`-filer, Vercels lokala projektmapp, byggresultat, beroenden och Supabase temporära filer är gitignorerade.

## Supabase Auth

När den permanenta produktionsadressen är känd, öppna **Supabase Dashboard → Authentication → URL Configuration** och ange:

- **Site URL:** `https://<produktionsdomän>`
- **Redirect URLs:**
  - `https://<produktionsdomän>/auth/confirm`
  - `http://localhost:3000/auth/confirm` för fortsatt lokal utveckling

Lägg bara till Vercels preview-mönster om registreringsflöden verkligen ska testas i preview-deployments. Produktionsdomänen ska anges exakt.

Öppna sedan **Authentication → Email Templates → Confirm signup**. Bekräftelselänken ska använda den redirect-adress som applikationen skickar samt token-hashen:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">
  Bekräfta e-postadress
</a>
```

Applikationen skickar alltid en `RedirectTo` med en befintlig `next`-parameter. `/auth/confirm` verifierar token server-side och tillåter endast återgång till en strikt validerad `/invite/<token>`- eller `/join/<slug>`-länk. Övriga mål går till `/login`.

Om en extern e-postleverantör senare aktiverar länkspårning bör den funktionen stängas av för autentiseringsmejl så att bekräftelselänkar inte skrivs om.

## Vercel

1. Importera det privata GitHub-repot i Vercel.
2. Låt Framework Preset vara **Next.js** och Root Directory vara repots rot.
3. Låt Vercel använda `pnpm install` och `pnpm build`, vilka identifieras från `pnpm-lock.yaml`, `packageManager` och projektets scripts.
4. Lägg in de två publika Supabase-variablerna för Production.
5. Skapa deploymenten och kopiera den slutliga `https://...`-adressen.
6. Uppdatera Supabase Auth-inställningarna ovan med den adressen.
7. Kör de manuella röktesterna nedan.

## Röktest efter deployment

- `/login` laddar och ett befintligt konto kan logga in och ut.
- Oinloggad användare skickas från `/dashboard` till `/login`.
- Medlem, personal och skoladministratör ser rätt navigation och nekas förbjudna routes.
- Operatören kan logga in på `/operator/login` och nå `/operator/schools`.
- En ny personalinbjudan använder produktionsdomänen, bekräftar e-posten och återgår till samma inbjudan.
- En medlemslänk använder produktionsdomänen, bekräftar e-posten och återgår till samma skolas join-sida.
- Ett hittegods med bild visas via en tidsbegränsad signerad Storage-URL.

Skapa inga demokonton och kör ingen seed mot det länkade projektet under deployment.
