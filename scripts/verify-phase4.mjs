import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const requiredVariables = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DEMO_STAFF_PASSWORD",
  "DEMO_MEMBER_PASSWORD",
];
const missing = requiredVariables.filter((name) => !process.env[name]);
if (missing.length > 0) throw new Error(`Miljövariabler saknas: ${missing.join(", ")}`);

function createAuthenticatedClient() {
  const cookies = new Map();
  const supabase = createServerClient(
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (values) => values.forEach(({ name, value }) => cookies.set(name, value)),
      },
    },
  );
  return { supabase, cookies };
}

function cookieHeader(cookies) {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Inloggning misslyckades för ${email}.`);
  return data.user;
}

async function verify() {
  const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: previousTestItems } = await serviceClient.from("items").select("id, image_path").eq("title", "Röd mössa – fas 4-demo");
  const oldImagePaths = (previousTestItems ?? []).map((item) => item.image_path).filter(Boolean);
  if (oldImagePaths.length > 0) await serviceClient.storage.from("item-images").remove(oldImagePaths);
  if ((previousTestItems ?? []).length > 0) await serviceClient.from("items").delete().in("id", previousTestItems.map((item) => item.id));

  const staff = createAuthenticatedClient();
  const staffUser = await signIn(staff.supabase, "personal@demo.borttappat.invalid", process.env.DEMO_STAFF_PASSWORD);
  const { data: staffProfile, error: profileError } = await staff.supabase.from("profiles").select("school_id, role").eq("id", staffUser.id).single();
  if (profileError) throw new Error("Personalprofilen kunde inte läsas.");
  assert.equal(staffProfile.role, "staff");

  const staffFormResponse = await fetch("http://localhost:3000/dashboard/items/new", {
    headers: { cookie: cookieHeader(staff.cookies) },
  });
  const staffFormHtml = await staffFormResponse.text();
  assert.equal(staffFormResponse.ok, true);
  assert.match(staffFormHtml, /Publicera fynd/);

  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nVQAAAAASUVORK5CYII=", "base64");
  const formData = new FormData();
  formData.set("image", new File([png], "rod-testmossa.png", { type: "image/png" }));
  formData.set("title", "Röd mössa – fas 4-demo");
  formData.set("category", "Kläder");
  formData.set("foundLocation", "Skolgården");
  formData.set("foundDate", new Date().toISOString().slice(0, 10));
  formData.set("description", "Testfynd skapat av den automatiska fas 4-kontrollen.");

  const createResponse = await fetch("http://localhost:3000/api/items", {
    method: "POST",
    headers: { cookie: cookieHeader(staff.cookies) },
    body: formData,
  });
  const createResult = await createResponse.json();
  if (!createResponse.ok) throw new Error(createResult.error ?? "Appen kunde inte publicera testfyndet.");
  assert.ok(createResult.id);

  const { data: createdItem, error: itemError } = await staff.supabase.from("items").select("id, school_id, created_by, image_path, status").eq("id", createResult.id).single();
  if (itemError) throw new Error("Det publicerade fyndet kunde inte verifieras som personal.");
  assert.equal(createdItem.school_id, staffProfile.school_id);
  assert.equal(createdItem.created_by, staffUser.id);
  assert.equal(createdItem.status, "available");
  assert.ok(createdItem.image_path?.startsWith(`${staffProfile.school_id}/${createdItem.id}/`));

  const member = createAuthenticatedClient();
  const memberUser = await signIn(member.supabase, "medlem@demo.borttappat.invalid", process.env.DEMO_MEMBER_PASSWORD);
  const { data: memberProfile } = await member.supabase.from("profiles").select("school_id, role").eq("id", memberUser.id).single();
  assert.equal(memberProfile?.role, "member");
  assert.equal(memberProfile?.school_id, staffProfile.school_id);

  const { data: visibleItem, error: memberReadError } = await member.supabase.from("items").select("id, image_path").eq("id", createdItem.id).single();
  if (memberReadError || !visibleItem) throw new Error("Medlemmen kunde inte se personalens publicerade fynd.");

  const memberCatalogueResponse = await fetch("http://localhost:3000/dashboard/items", {
    headers: { cookie: cookieHeader(member.cookies) },
  });
  const memberCatalogueHtml = await memberCatalogueResponse.text();
  assert.equal(memberCatalogueResponse.ok, true);
  assert.match(memberCatalogueHtml, /Röd mössa/);

  const memberDetailResponse = await fetch(`http://localhost:3000/dashboard/items/${createdItem.id}`, {
    headers: { cookie: cookieHeader(member.cookies) },
  });
  const memberDetailHtml = await memberDetailResponse.text();
  assert.equal(memberDetailResponse.ok, true);
  assert.match(memberDetailHtml, /Det här är mitt/);

  const memberNewItemResponse = await fetch("http://localhost:3000/dashboard/items/new", {
    headers: { cookie: cookieHeader(member.cookies) },
    redirect: "manual",
  });
  const memberNewItemHtml = await memberNewItemResponse.text();
  assert.doesNotMatch(memberNewItemHtml, /Publicera fynd/);
  assert.match(memberNewItemHtml, /NEXT_REDIRECT|access=denied/);

  const memberApiResponse = await fetch("http://localhost:3000/api/items", {
    method: "POST",
    headers: { cookie: cookieHeader(member.cookies) },
    body: new FormData(),
  });
  assert.equal(memberApiResponse.status, 403);

  const { data: signedImage, error: signedImageError } = await member.supabase.storage.from("item-images").createSignedUrl(visibleItem.image_path, 60);
  if (signedImageError || !signedImage?.signedUrl) throw new Error("Medlemmen kunde inte skapa en säker bildlänk.");
  const imageResponse = await fetch(signedImage.signedUrl);
  assert.equal(imageResponse.ok, true);
  assert.match(imageResponse.headers.get("content-type") ?? "", /^image\/png/);

  const { error: forbiddenCreateError } = await member.supabase.from("items").insert({
    school_id: memberProfile.school_id,
    created_by: memberUser.id,
    title: "Otillåtet medlemsfynd",
    category: "Övrigt",
  });
  assert.ok(forbiddenCreateError, "En medlem fick oväntat skapa ett fynd.");

  console.log("Godkänd: personal publicerade ett fynd med korrekt ägarskap.");
  console.log("Godkänd: medlemmen såg fyndet och hämtade dess privata bild.");
  console.log("Godkänd: medlemmen nekades att skapa fynd.");
  console.log("Godkänd: formulär, katalog, detaljsida och serveromdirigering fungerar.");
  console.log(`Testfynd: ${createdItem.id}`);
}

verify().catch((error) => {
  console.error("Fas 4-verifieringen misslyckades:", error.message);
  process.exitCode = 1;
});
