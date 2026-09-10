import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSwedishAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Fel e-postadress eller lösenord.";
  }

  if (normalized.includes("email not confirmed")) {
    return "E-postadressen är inte bekräftad ännu.";
  }

  if (normalized.includes("too many requests") || normalized.includes("rate limit")) {
    return "För många försök. Vänta en stund och försök igen.";
  }

  return "Det gick inte att logga in. Kontrollera uppgifterna och försök igen.";
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Inloggningsuppgifterna kunde inte läsas." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Fyll i både e-postadress och lösenord." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: getSwedishAuthError(error.message) }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
