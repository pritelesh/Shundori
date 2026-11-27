import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".sql",
  ".yml",
  ".yaml",
  ".toml",
  ".example",
]);
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

function sourceFiles(directory = root, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(path, output);
      continue;
    }
    if (entry.name.startsWith(".env") && entry.name !== ".env.example") continue;
    if (!TEXT_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")))) continue;
    output.push(path);
  }
  return output;
}

test("Vercel build settings match the production script", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.build, "next build");
  assert.match(pkg.engines.node, />=20\.9/);

  const vercel = JSON.parse(read("vercel.json"));
  assert.equal(vercel.framework, "nextjs");
  assert.equal(vercel.buildCommand, "npm run build");
});

test("security headers cover CSP, HSTS and confirmation pages", () => {
  const config = read("next.config.ts");
  for (const header of [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(config.includes(header), `${header} is missing`);
  }
  assert.match(config, /isProduction/);
  assert.match(config, /\/order-success\/:path\*/);
  assert.match(config, /private, no-store/);
});

test("service role key stays server-only", () => {
  const example = read(".env.example");
  assert.match(example, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(example, /NEXT_PUBLIC_SUPABASE_ANON_KEY=/);
  assert.match(example, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.doesNotMatch(example, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY\s*=/);

  const serverEnv = read("lib/env/server.ts");
  assert.match(serverEnv, /import "server-only"/);
  assert.match(serverEnv, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(serverEnv, /throw new Error/);
});

test("initial administrator has no hardcoded password", () => {
  const script = read("scripts/create-admin.mjs");
  assert.match(script, /const password = process\.env\.ADMIN_PASSWORD/);
  assert.match(script, /password\.length < 12/);
  assert.match(script, /email_confirm: true/);
  assert.match(script, /role: "admin"/);
  assert.doesNotMatch(script, /const password\s*=\s*["'][^"']+["']/);
});

test("migrations are complete and ordered with no Phase 9 schema file", () => {
  const migrations = readdirSync(join(root, "supabase", "migrations"))
    .filter((name) => /^\d{4}_.*\.sql$/.test(name))
    .sort();
  assert.equal(migrations.length, 10);
  assert.equal(migrations[0], "0001_profiles_and_helpers.sql");
  assert.equal(migrations[9], "0010_phase8.sql");
  assert.equal(existsSync(join(root, "supabase", "migrations", "0011_phase9.sql")), false);
  assert.match(read("supabase/README.md"), /0010_phase8\.sql/);
});

test("time-dependent catalogue routes defer pricing to request time", () => {
  const routes = [
    "app/(storefront)/page.tsx",
    "app/(storefront)/shop/page.tsx",
    "app/(storefront)/search/page.tsx",
    "app/(storefront)/category/[slug]/page.tsx",
    "app/(storefront)/brand/[slug]/page.tsx",
    "app/(storefront)/product/[slug]/page.tsx",
    "app/(storefront)/product/[slug]/opengraph-image.tsx",
  ];
  for (const route of routes) {
    const source = read(route);
    assert.match(source, /from "next\/server"/, `${route} lacks connection import`);
    assert.match(source, /await connection\(\)/, `${route} lacks connection call`);
  }
});

test("no credential-shaped tokens are present in source files", () => {
  const secretPattern =
    /(?:eyJ[A-Za-z0-9_-]{10,}\.){2}[A-Za-z0-9_-]{10,}|sb_secret_[A-Za-z0-9_-]{16,}/;
  const hits = [];
  for (const file of sourceFiles()) {
    if (secretPattern.test(readFileSync(file, "utf8"))) {
      hits.push(file.slice(root.length + 1));
    }
  }
  assert.deepEqual(hits, []);
});

test("Phase 10 operation guides are present", () => {
  const guides = [
    "docs/installation.md",
    "docs/admin-guide.md",
    "docs/product-upload-guide.md",
    "docs/inventory-management-guide.md",
    "docs/order-management-guide.md",
    "docs/deployment-guide.md",
    "docs/backup-guide.md",
    "docs/environment-variables.md",
  ];
  for (const guide of guides) {
    assert.ok(existsSync(join(root, guide)), `${guide} is missing`);
  }
});
