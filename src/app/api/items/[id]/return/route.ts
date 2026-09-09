import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const STAFF_ROLES = new Set(["staff", "school_admin"]);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthState();
  if (auth.status === "unauthenticated") return errorResponse("Du behöver logga in igen.", 401);
  if (auth.status !== "authenticated" || !STAFF_ROLES.has(auth.profile.role)) {
    return errorResponse("Du har inte behörighet att lämna ut föremål.", 403);
  }

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_item_returned", { target_item_id: id });

  if (error?.code === "42501") return errorResponse("Du har inte behörighet till föremålet.", 403);
  if (error?.message?.includes("not ready")) return errorResponse("Föremålet kan inte markeras som utlämnat ännu.", 409);
  if (error) return errorResponse("Utlämningen kunde inte sparas. Försök igen.", 500);

  revalidatePath(`/dashboard/items/${id}`);
  revalidatePath("/dashboard/items");
  revalidatePath("/dashboard/claims");
  revalidatePath("/dashboard/my-claims");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
