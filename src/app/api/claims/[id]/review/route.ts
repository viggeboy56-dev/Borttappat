import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const STAFF_ROLES = new Set(["staff", "school_admin"]);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthState();
  if (auth.status === "unauthenticated") return errorResponse("Du behöver logga in igen.", 401);
  if (auth.status !== "authenticated" || !STAFF_ROLES.has(auth.profile.role)) {
    return errorResponse("Du har inte behörighet att granska anspråk.", 403);
  }

  const { id } = await params;
  let body: { decision?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("Beslutet kunde inte läsas.", 400);
  }

  if (body.decision !== "approved" && body.decision !== "rejected") {
    return errorResponse("Välj om anspråket ska godkännas eller avslås.", 400);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_claim", {
    target_claim_id: id,
    decision: body.decision,
  });

  if (error?.code === "42501") return errorResponse("Du har inte behörighet till detta anspråk.", 403);
  if (error?.message?.includes("no longer")) return errorResponse("Anspråket har redan behandlats. Ladda om sidan.", 409);
  if (error) return errorResponse("Beslutet kunde inte sparas. Försök igen.", 500);

  revalidatePath("/dashboard/claims");
  revalidatePath("/dashboard/items");
  revalidatePath("/dashboard/my-claims");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
