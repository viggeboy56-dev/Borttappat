import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/server";
import { validateClaimMessage } from "@/lib/claims/constants";
import { createClient } from "@/lib/supabase/server";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const auth = await getAuthState();
  if (auth.status === "unauthenticated") return errorResponse("Du behöver logga in igen.", 401);
  if (auth.status !== "authenticated" || auth.profile.role !== "member") {
    return errorResponse("Endast medlemmar kan skicka anspråk.", 403);
  }

  let body: { itemId?: unknown; message?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("Formuläret kunde inte läsas.", 400);
  }

  if (typeof body.itemId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.itemId)) {
    return errorResponse("Föremålet kunde inte identifieras.", 400);
  }

  const messageError = validateClaimMessage(body.message);
  if (messageError) return errorResponse(messageError, 400);

  const message = (body.message as string).trim();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_claim", {
    target_item_id: body.itemId,
    ownership_message: message,
  });

  if (error?.code === "23505") return errorResponse("Du har redan ett väntande anspråk på föremålet.", 409);
  if (error?.code === "42501") return errorResponse("Föremålet är inte längre tillgängligt för anspråk.", 403);
  if (error || typeof data !== "string") return errorResponse("Anspråket kunde inte skickas. Försök igen.", 500);

  revalidatePath(`/dashboard/items/${body.itemId}`);
  revalidatePath("/dashboard/my-claims");
  revalidatePath("/dashboard/claims");
  revalidatePath("/dashboard");
  return NextResponse.json({ id: data }, { status: 201 });
}
