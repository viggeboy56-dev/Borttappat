import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { getAccessDecision } from "../src/lib/auth/access.ts";

const requiredVariables = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "DEMO_ADMIN_PASSWORD",
  "DEMO_STAFF_PASSWORD",
  "DEMO_MEMBER_PASSWORD",
];

const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(`Miljövariabler saknas: ${missingVariables.join(", ")}`);
}

const demoUsers = [
  {
    email: "admin@demo.borttappat.invalid",
    password: process.env.DEMO_ADMIN_PASSWORD,
    expectedRole: "school_admin",
  },
  {
    email: "personal@demo.borttappat.invalid",
    password: process.env.DEMO_STAFF_PASSWORD,
    expectedRole: "staff",
  },
  {
    email: "medlem@demo.borttappat.invalid",
    password: process.env.DEMO_MEMBER_PASSWORD,
    expectedRole: "member",
  },
];

const expectedRouteDecisions = {
  member: {
    "/dashboard": "allow",
    "/dashboard/items": "allow",
    "/dashboard/items/new": "denied",
    "/dashboard/claims": "denied",
    "/dashboard/admin": "denied",
  },
  staff: {
    "/dashboard": "allow",
    "/dashboard/items": "allow",
    "/dashboard/items/new": "allow",
    "/dashboard/claims": "allow",
    "/dashboard/admin": "denied",
  },
  school_admin: {
    "/dashboard": "allow",
    "/dashboard/items": "allow",
    "/dashboard/items/new": "allow",
    "/dashboard/claims": "allow",
    "/dashboard/admin": "allow",
  },
};

async function verifyUser(definition) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: definition.email,
    password: definition.password,
  });

  if (authError) throw new Error(`${definition.email}: inloggningen misslyckades.`);
  assert.ok(authData.user, `${definition.email}: användare saknas efter inloggning.`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, school_id, role")
    .eq("id", authData.user.id)
    .single();

  if (profileError) throw new Error(`${definition.email}: profilen kunde inte läsas.`);
  assert.equal(profile.role, definition.expectedRole);
  assert.ok(profile.full_name);
  assert.ok(profile.school_id);

  for (const [pathname, expectedDecision] of Object.entries(
    expectedRouteDecisions[profile.role],
  )) {
    assert.equal(
      getAccessDecision({
        pathname,
        isAuthenticated: true,
        hasProfile: true,
        role: profile.role,
      }),
      expectedDecision,
      `${definition.email}: fel behörighet för ${pathname}`,
    );
  }

  await supabase.auth.signOut();
  console.log(`Godkänd: ${definition.email} (${profile.role})`);
}

async function verify() {
  for (const definition of demoUsers) {
    await verifyUser(definition);
  }

  console.log("Alla demoinloggningar och rollkontroller är godkända.");
}

verify().catch((error) => {
  console.error("Verifieringen misslyckades:", error.message);
  process.exitCode = 1;
});
