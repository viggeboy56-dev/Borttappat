import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OperatorState = { status: "unauthenticated" } | { status: "denied"; userId: string } | { status: "authorized"; userId: string };

export const getOperatorState = cache(async (): Promise<OperatorState> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return { status: "unauthenticated" };
  const { data, error } = await supabase.rpc("is_operator");
  if (error || data !== true) return { status: "denied", userId };
  return { status: "authorized", userId };
});

export async function requireOperator() {
  const state = await getOperatorState();
  if (state.status === "unauthenticated") redirect("/operator/login");
  if (state.status === "denied") redirect("/dashboard?access=denied");
  return state;
}
