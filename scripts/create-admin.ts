/**
 * Creates (or promotes) a researcher/admin account.
 *
 * Usage:
 *   npm run create-admin -- --email you@example.edu --password "a-strong-password" --name "Your Name" --role admin
 *
 * Requires .env.local with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(__dirname, "../.env.local") });

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const email = getArg("email");
  const password = getArg("password");
  const name = getArg("name") ?? "";
  const role = getArg("role") === "admin" ? "admin" : "researcher";

  if (!email || !password) {
    console.error('Usage: npm run create-admin -- --email you@example.edu --password "..." [--name "Your Name"] [--role admin]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId: string;
  if (createError) {
    if (!createError.message.includes("already been registered")) {
      console.error("Could not create user:", createError.message);
      process.exit(1);
    }
    const { data: list, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === email);
    if (!existing) throw new Error("User creation conflicted but existing user not found.");
    userId = existing.id;
    console.log(`User ${email} already exists — updating role/profile only.`);
  } else {
    userId = created.user.id;
    console.log(`Created auth user ${email}.`);
  }

  const { error: profileError } = await supabase
    .from("admin_profiles")
    .upsert({ id: userId, email, display_name: name || null, role }, { onConflict: "id" });
  if (profileError) throw profileError;

  console.log(`Admin profile ready: ${email} (role: ${role}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
