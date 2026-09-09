import { createClient } from "@supabase/supabase-js";

const requiredVariables = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "DEMO_ADMIN_PASSWORD",
  "DEMO_STAFF_PASSWORD",
  "DEMO_MEMBER_PASSWORD",
];

const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(`Miljövariabler saknas: ${missingVariables.join(", ")}`);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const demoUsers = [
  {
    email: "admin@demo.borttappat.invalid",
    password: process.env.DEMO_ADMIN_PASSWORD,
    fullName: "Demo Administratör",
    role: "school_admin",
  },
  {
    email: "personal@demo.borttappat.invalid",
    password: process.env.DEMO_STAFF_PASSWORD,
    fullName: "Demo Personal",
    role: "staff",
  },
  {
    email: "medlem@demo.borttappat.invalid",
    password: process.env.DEMO_MEMBER_PASSWORD,
    fullName: "Demo Medlem",
    role: "member",
  },
];

async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email === email);
    if (user) return user;
    if (data.users.length < 100) return null;
  }

  throw new Error("Kunde inte söka igenom alla utvecklingsanvändare.");
}

async function ensureUser({ email, password, fullName }) {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) throw error;
  return data.user;
}

async function seed() {
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .upsert({ name: "Borttappat Demoskola", slug: "borttappat-demoskola" }, { onConflict: "slug" })
    .select("id")
    .single();

  if (schoolError) throw schoolError;

  const users = [];
  for (const definition of demoUsers) {
    const user = await ensureUser(definition);
    users.push({ ...definition, id: user.id });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    users.map((user) => ({
      id: user.id,
      school_id: school.id,
      full_name: user.fullName,
      role: user.role,
    })),
  );

  if (profileError) throw profileError;

  const staff = users.find((user) => user.role === "staff");
  const { data: existingItems, error: itemsReadError } = await supabase
    .from("items")
    .select("id")
    .eq("school_id", school.id)
    .limit(1);

  if (itemsReadError) throw itemsReadError;

  if (existingItems.length === 0) {
    const { error: itemsError } = await supabase.from("items").insert([
      {
        school_id: school.id,
        created_by: staff.id,
        title: "Blå ryggsäck",
        description: "Mörkblå ryggsäck med ett litet reflexband.",
        category: "Väskor",
        found_location: "Matsalen",
        found_date: "2026-09-05",
      },
      {
        school_id: school.id,
        created_by: staff.id,
        title: "Svart vattenflaska",
        description: "Svart metallflaska utan namnmärkning.",
        category: "Övrigt",
        found_location: "Idrottshallen",
        found_date: "2026-09-06",
      },
      {
        school_id: school.id,
        created_by: staff.id,
        title: "Grön mössa",
        description: "Stickad grön mössa i barnstorlek.",
        category: "Kläder",
        found_location: "Skolgården",
        found_date: "2026-09-07",
      },
    ]);

    if (itemsError) throw itemsError;
  }

  console.log("Demodata skapad eller redan uppdaterad.");
  console.log(`Skola: ${school.id}`);
  console.log(`Användare: ${demoUsers.map((user) => user.email).join(", ")}`);
}

seed().catch((error) => {
  console.error("Seed misslyckades:", error.message);
  process.exitCode = 1;
});
