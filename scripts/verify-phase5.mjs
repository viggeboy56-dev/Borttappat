import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const required = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "DEMO_STAFF_PASSWORD", "DEMO_MEMBER_PASSWORD"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Miljövariabler saknas: ${missing.join(", ")}`);

function authenticatedClient() {
  const cookies = new Map();
  const supabase = createServerClient(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)),
    },
  });
  return { supabase, cookies };
}

const cookieHeader = (cookies) => [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");

async function signIn(client, email, password) {
  const { data, error } = await client.supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Inloggning misslyckades för ${email}.`);
  return data.user;
}

async function jsonRequest(path, client, body) {
  const response = await fetch(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { cookie: cookieHeader(client.cookies), ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  return { response, result };
}

async function verify() {
  const service = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const title = "Blå ryggsäck – fas 5-demo";
  const { data: oldItems } = await service.from("items").select("id, image_path").eq("title", title);
  const paths = (oldItems ?? []).map((item) => item.image_path).filter(Boolean);
  if (paths.length) await service.storage.from("item-images").remove(paths);
  if (oldItems?.length) await service.from("items").delete().in("id", oldItems.map((item) => item.id));

  const staff = authenticatedClient();
  await signIn(staff, "personal@demo.borttappat.invalid", process.env.DEMO_STAFF_PASSWORD);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nVQAAAAASUVORK5CYII=", "base64");
  const form = new FormData();
  form.set("image", new File([png], "bla-ryggsack.png", { type: "image/png" }));
  form.set("title", title);
  form.set("category", "Väskor");
  form.set("foundLocation", "Biblioteket");
  form.set("foundDate", new Date().toISOString().slice(0, 10));
  form.set("description", "Automatiskt testföremål för anspråksflödet.");
  const createResponse = await fetch("http://localhost:3000/api/items", { method: "POST", headers: { cookie: cookieHeader(staff.cookies) }, body: form });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201, created.error);

  const member = authenticatedClient();
  await signIn(member, "medlem@demo.borttappat.invalid", process.env.DEMO_MEMBER_PASSWORD);
  const detailBefore = await (await fetch(`http://localhost:3000/dashboard/items/${created.id}`, { headers: { cookie: cookieHeader(member.cookies) } })).text();
  assert.match(detailBefore, /Det här är mitt/);

  const message = "Mitt namn står skrivet på etiketten i det främre facket.";
  const submitted = await jsonRequest("/api/claims", member, { itemId: created.id, message });
  assert.equal(submitted.response.status, 201, submitted.result.error);
  const duplicate = await jsonRequest("/api/claims", member, { itemId: created.id, message });
  assert.equal(duplicate.response.status, 409);

  const myClaims = await (await fetch("http://localhost:3000/dashboard/my-claims", { headers: { cookie: cookieHeader(member.cookies) } })).text();
  assert.match(myClaims, /Blå ryggsäck/);
  assert.match(myClaims, /Väntar på granskning/);

  const forbiddenReview = await jsonRequest(`/api/claims/${submitted.result.id}/review`, member, { decision: "approved" });
  assert.equal(forbiddenReview.response.status, 403);

  const staffClaims = await (await fetch("http://localhost:3000/dashboard/claims", { headers: { cookie: cookieHeader(staff.cookies) } })).text();
  assert.match(staffClaims, /Mitt namn står skrivet/);
  const approved = await jsonRequest(`/api/claims/${submitted.result.id}/review`, staff, { decision: "approved" });
  assert.equal(approved.response.status, 200, approved.result.error);

  const { data: approvedState } = await service.from("claims").select("status, items(status)").eq("id", submitted.result.id).single();
  assert.equal(approvedState?.status, "approved");
  assert.equal(approvedState?.items?.status, "claimed");

  const detailAfterApproval = await (await fetch(`http://localhost:3000/dashboard/items/${created.id}`, { headers: { cookie: cookieHeader(member.cookies) } })).text();
  assert.match(detailAfterApproval, /Godkänt/);

  const returned = await jsonRequest(`/api/items/${created.id}/return`, staff);
  assert.equal(returned.response.status, 200, returned.result.error);
  const { data: finalItem } = await service.from("items").select("status").eq("id", created.id).single();
  assert.equal(finalItem?.status, "returned");

  const finalMemberPage = await (await fetch("http://localhost:3000/dashboard/my-claims", { headers: { cookie: cookieHeader(member.cookies) } })).text();
  assert.match(finalMemberPage, /Utlämnat/);

  console.log("Godkänd: medlem skickade anspråk och dubbletten blockerades.");
  console.log("Godkänd: personal granskade och godkände anspråket.");
  console.log("Godkänd: föremålet reserverades, lämnades ut och historiken finns kvar.");
  console.log("Godkänd: medlems- och personalrollerna nekades/tilläts korrekt genom appens API.");
}

verify().catch((error) => {
  console.error("Fas 5-verifieringen misslyckades:", error.message);
  process.exitCode = 1;
});
