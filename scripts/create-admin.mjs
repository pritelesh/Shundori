/**
 * Create or upgrade the initial Shundori administrator in a live Supabase
 * project. The password is supplied only through ADMIN_PASSWORD; this script
 * never contains a default password and never prints secrets.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_EMAIL = 'owner@example.com'
 *   $env:ADMIN_PASSWORD = '<unique-long-password>'
 *   $env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-key>'
 *   $env:NEXT_PUBLIC_SUPABASE_URL = 'https://<project>.supabase.co'
 *   npm run create:admin
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 0) continue;

    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function fail(message) {
  console.error(`ERROR  ${message}`);
  process.exit(1);
}

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME?.trim() || "Shundori Administrator";

if (!url || !serviceRoleKey) {
  fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("Set ADMIN_EMAIL to a valid email address.");
}

if (!password || password.length < 12) {
  fail("Set ADMIN_PASSWORD to a unique password of at least 12 characters.");
}

const weakPasswords = new Set([
  "password",
  "password123",
  "password1234",
  "admin123",
  "admin1234",
  "shundori123",
  "changeme",
  "letmein",
  "qwerty123456",
]);
if (weakPasswords.has(password.toLowerCase())) {
  fail("ADMIN_PASSWORD is a known weak value. Choose a unique password.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId;

const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (!created.error && created.data.user) {
  userId = created.data.user.id;
} else if (created.error && /already|exists|registered/i.test(created.error.message)) {
  // The account exists. Rotate its password only when the operator explicitly
  // supplied one through ADMIN_PASSWORD, then promote the profile to admin.
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) fail(`Could not look up the existing user: ${listed.error.message}`);

  const existing = listed.data.users.find(
    (user) => user.email?.toLowerCase() === email,
  );
  if (!existing) fail("The email exists but could not be resolved. Stop.");

  userId = existing.id;
  const updated = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (updated.error) fail(`Could not update the existing user: ${updated.error.message}`);
} else {
  fail(`Could not create the administrator: ${created.error?.message ?? "unknown error"}`);
}

const profile = await admin
  .from("profiles")
  .upsert(
    { id: userId, full_name: fullName, email, role: "admin" },
    { onConflict: "id" },
  );

if (profile.error) fail(`Could not grant the admin role: ${profile.error.message}`);

console.log(`ADMIN_READY id=${userId} email=${email} role=admin`);
console.log("Store the password in your secure vault; it was not printed.");
