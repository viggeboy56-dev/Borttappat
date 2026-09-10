import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthState } from "@/lib/auth/server";
import { hashInvitationToken } from "@/lib/admin/token";
import { isInvitationToken } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await getAuthState();
  if (auth.status === "unauthenticated") return NextResponse.json({ error: "Logga in med den inbjudna e-postadressen först." }, { status: 401 });
  let body: { token?: unknown }; try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Inbjudan kunde inte läsas." }, { status: 400 }); }
  if (!isInvitationToken(body.token)) return NextResponse.json({ error: "Inbjudningslänken är ogiltig." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { invitation_token_hash: hashInvitationToken(body.token) });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("email does not match")) return NextResponse.json({ error: "Du är inloggad med en annan e-postadress än den som bjöds in." }, { status: 403 });
    if (message.includes("another school")) return NextResponse.json({ error: "Kontot tillhör redan en annan skola och kan inte flyttas." }, { status: 409 });
    if (message.includes("expired")) return NextResponse.json({ error: "Inbjudan har gått ut." }, { status: 410 });
    if (message.includes("cancelled")) return NextResponse.json({ error: "Inbjudan har avbrutits." }, { status: 410 });
    if (message.includes("already")) return NextResponse.json({ error: "Inbjudan har redan använts." }, { status: 409 });
    return NextResponse.json({ error: "Inbjudan kunde inte accepteras." }, { status: 400 });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
