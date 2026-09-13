import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getEmailConfirmationNextPath } from "@/lib/auth/confirmation";
import { createClient } from "@/lib/supabase/server";

function isConfirmationType(value: string | null): value is EmailOtpType {
  return value === "email" || value === "signup";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const nextPath = getEmailConfirmationNextPath(
    request.nextUrl.searchParams.get("next"),
  );

  if (code || (tokenHash && isConfirmationType(type))) {
    const supabase = await createClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: type as EmailOtpType,
        });

    if (!error) return NextResponse.redirect(new URL(nextPath, request.url));
  }

  const failureUrl = new URL(nextPath, request.url);
  failureUrl.searchParams.set("confirmation", "failed");
  return NextResponse.redirect(failureUrl);
}
