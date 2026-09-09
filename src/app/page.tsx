import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/server";

export default async function Home() {
  const state = await getAuthState();
  redirect(state.status === "unauthenticated" ? "/login" : "/dashboard");
}
