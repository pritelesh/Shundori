# Phase 10 — production deployment preparation and launch report

Date: 27 November 2026  
Status: **prepared, NOT DEPLOYED, awaiting owner approval and credentials.**

Phase 10 prepared the Shundori Next.js application for deployment. It did not
deploy anything, create a paid service, configure Vercel, configure a domain,
or start Phase 11. The initial source repository and remote were configured
afterwards; no existing repository was overwritten and no Git history was
rewritten. No production URL is claimed.

## Launch status

| Item | Status |
| --- | --- |
| Production website URL | **Not available.** No deployment was performed. |
| Admin dashboard URL | **Not available.** The intended path is `/admin/login` on the owner's final domain once deployed. |
| Supabase connection status | **Not connected to production.** Phase 9 verified a disposable local stack; it was stopped and cleaned up. No production project or credentials exist here. |
| Deployment status | **NOT DEPLOYED.** Vercel deployment integration is not configured. |
| Database status | Migrations `0001`–`0010` are present and ordered. They have **not** been applied to a production database. |
| Security status | Static checks and a local production-mode header smoke test passed. Production hardening items still require owner action. |
| Final launch checklist | **Not started.** See below. |

Phase 10 is therefore **not LIVE**. It must not be described as production-ready
until the owner supplies credentials, approves deployment, and the production
verification checklist is completed.

## Final production verification attempt

A final production verification was attempted on 27 November 2026. It could not
be completed because no production target exists in this workspace:

- no deployed website URL or final domain;
- no `.vercel` project link and no Vercel authentication;
- no Git repository or configured remote at the time of that attempt;
- no `.env.local`, and none of `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL` or `ADMIN_PASSWORD` is set in the
  execution environment;
- no local server or Supabase stack is running.

This list records the original Phase 10 attempt. An initial Git repository and
remote were configured afterwards; production deployment status is unchanged.

| # | Production verification item | Result | Evidence / blocker |
| --- | --- | --- | --- |
| 1 | Website accessible | **Not verified** | No production URL or deployment. A local production build passes and previously served HTTP 200, but that is not production. |
| 2 | HTTPS works | **Not verified** | No final domain, DNS record, Vercel domain or SSL certificate was supplied. |
| 3 | Supabase database connected | **Not connected** | No production Supabase URL or keys are configured. Migrations were checked statically only. |
| 4 | Admin login works | **Not verified** | Requires a deployed site and a production admin user. `npm run create:admin` is ready but has not been run. |
| 5 | Product upload works | **Not verified** | Requires production Auth, Database and Storage access. Local Phase 9 evidence only. |
| 6 | Product images load | **Not verified in production** | Requires deployed public Storage URLs. Local demo/local-stack checks passed previously. |
| 7 | Customer ordering works | **Not verified** | Requires production Supabase and a controlled live order test. Static checkout verification passed only. |
| 8 | COD checkout works | **Not verified in production** | `npm run verify:checkout` passed 8/8; live COD audit must not run against production without owner-approved test data. |
| 9 | Orders appear in admin dashboard | **Not verified** | Requires production admin session and real/approved test order data. |
| 10 | Order tracking works | **Not verified** | Requires a production order number/phone pair and live database. Static order checks passed 6/6. |
| 11 | RLS protects customer data | **Not verified in production** | Phase 9 live RLS checks passed on a disposable local stack. Production schema and policies have not been checked. |
| 12 | Mobile website works | **Not verified in production** | Local responsive checks passed previously; production device/Lighthouse checks are outstanding. |
| 13 | No critical production errors | **Cannot be concluded** | Fresh local typecheck, lint, build and Phase 10 checks pass, and earlier local production-mode smoke checks passed, but production telemetry and deployed routes are unavailable. |

Fresh checks completed during this verification attempt:

| Check | Result |
| --- | --- |
| `npm run verify:phase10` | 8/8 |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run build` | passed; 100 static entries generated |

**Conclusion:** the final production verification is **blocked, not failed in
code and not passed in production**. No item from 1–13 may be reported as
verified until the deployment and credentials below exist.

## Work completed

### Pre-deployment inspection and fixes

- Inspected project structure, dependencies, environment template, migrations,
  RLS/Storage policies, auth roles, routes and build settings.
- Added baseline production security headers in `next.config.ts`:
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, CSP, and production-only HSTS. Confirmation pages keep
  `no-referrer` and `private, no-store`.
- Added `vercel.json` with framework `nextjs` and build command `npm run build`.
- Added `scripts/create-admin.mjs` and `npm run create:admin`. The initial admin
  email and password come only from the shell; there is no default password,
  the password is never printed, the account is email-confirmed, and the profile
  is promoted to `admin`.
- Completed the migration documentation to include `0010_phase8.sql`.
- Fixed two deployment blockers found during this pass:
  1. A clean demo-mode build failed because time-dependent offer prices called
     `new Date()` during prerendering. Home, shop, search, category, brand,
     product and product OG-image routes now defer price rendering to request
     time with `await connection()`.
  2. A production-mode smoke request logged repeated "Supabase is not configured"
     errors from `WishlistSync` in demo mode. `services/wishlist.ts` now returns
     guest state when public Supabase credentials are absent.
- Added `scripts/verify-phase10.mjs` and `npm run verify:phase10` to assert
  build settings, security headers, server-only service-role handling, admin
  bootstrap rules, migration order, request-time pricing guards, absence of
  credential-shaped tokens, and presence of the operation guides.

### Checks run after the final edits

| Check | Result |
| --- | --- |
| `npm run typecheck` | passed |
| `npm run lint` | passed |
| `npm run build` | passed — Next.js 16.4.6, all 100 static entries generated |
| `npm run verify:checkout` | 8/8 |
| `npm run verify:orders` | 6/6 |
| `npm run verify:phase8` | 14/14 |
| `npm run verify:phase9` | 13/13 |
| `npm run verify:phase10` | 8/8 |
| Local `next start` smoke test | HTTP 200 for `/`, `/shop`, a product page and `/order-success/SD-SMOKE`; zero "Supabase is not configured" errors |
| Header smoke test | CSP, HSTS, `nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy` and no `X-Powered-By`; confirmation path `no-referrer` / `private, no-store` |

`npm run verify:supabase` and the live `audit:*` scripts were not run in Phase 10
because no production credentials were supplied. Their Phase 9 results remain
valid for the disposable local stack only and must not be reported as production
verification.

### GitHub and repository preparation

- `.gitignore` already excludes `.env*`, `.next`, `node_modules`, `.vercel` and
  build output while allowing `.env.example`.
- No credential-shaped tokens were found in source files by `verify:phase10`.
  Phase 9 also found no service-role JWT in generated client bundles.
- README and operations guides were updated.
- No repository was initialized or pushed because the owner has not supplied an
  approved repository and deployment has not been authorized.

### Supabase preparation

- Migration order `0001` through `0010` was verified statically.
- RLS, Storage bucket policies, auth roles and relationships were reviewed from
  the migration files and Phase 9 verification evidence.
- The admin bootstrap script is ready but has not been run, because it needs the
  owner's production URL, service-role key and a shell-supplied password.
- No production schema, data, bucket or auth setting was changed.

### Vercel and domain preparation

- `vercel.json` declares the Next.js framework and build command.
- Required Vercel variables are documented in
  [`environment-variables.md`](environment-variables.md) and
  [`deployment-guide.md`](deployment-guide.md). `SUPABASE_SERVICE_ROLE_KEY` is
  server-only; `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` is forbidden.
- No Vercel project, GitHub integration, environment variable, domain, DNS
  record or SSL certificate was configured. No domain name was invented.

### Documentation created

- [`installation.md`](installation.md)
- [`admin-guide.md`](admin-guide.md)
- [`product-upload-guide.md`](product-upload-guide.md)
- [`inventory-management-guide.md`](inventory-management-guide.md)
- [`order-management-guide.md`](order-management-guide.md)
- [`deployment-guide.md`](deployment-guide.md)
- [`backup-guide.md`](backup-guide.md)
- [`environment-variables.md`](environment-variables.md)

## Remaining issues and owner decisions

1. No production credentials, Supabase project, GitHub repository or Vercel
   project have been supplied.
2. The final domain has not been purchased or selected; DNS and SSL cannot be
   verified. No URL is fabricated.
3. Rate limits/WAF rules for checkout, tracking, cancellation and login remain
   deployment-environment decisions.
4. Production Supabase Auth password policy, email confirmation, session and
   redirect URL settings require owner review.
5. Monitoring/alerts for failed checkouts, coupon abuse, stock anomalies and
   admin auth failures are not configured.
6. Production Lighthouse/Core Web Vitals have not been measured. Only local
   development-tool results exist from Phase 9.
7. The current CSP uses `'unsafe-inline'` for Next.js inline scripts. A strict
   nonce-based CSP is optional additional hardening and would require a separate
   dynamic-rendering decision.
8. Public Storage object URLs bypass RLS by design. Sensitive files must never
   be uploaded to the four public buckets.
9. Online payment and courier integrations remain disabled placeholders.

## Final launch checklist — not yet performed

- [ ] Owner explicitly approves deployment and accepts the remaining issues.
- [ ] Owner supplies the approved GitHub repository; workspace is committed/pushed without credentials.
- [ ] Vercel imports that repository and uses `npm run build`.
- [ ] Owner supplies and securely stores production Supabase URL, anon key and service-role key.
- [ ] Migrations `0001`–`0010` are applied to the production database in order.
- [ ] `verify:supabase` is run against that project only if the owner approves; no `audit:*` script touches production.
- [ ] Initial admin is created with `npm run create:admin` using shell-only credentials; password is stored in the owner's vault.
- [ ] Production Auth site URL and redirect URLs are set to the final HTTPS origin.
- [ ] Final domain is added in Vercel; DNS, HTTPS and SSL are verified.
- [ ] `NEXT_PUBLIC_SITE_URL` matches the final domain.
- [ ] Production response headers, client-bundle secret scan and noindex routes are rechecked.
- [ ] Homepage, products, search, categories, brands, cart, checkout, COD, confirmation, tracking, admin login, product upload and images are tested in production.
- [ ] Order management, cancellation and stock restoration are exercised only with owner-approved disposable data and reconciled.
- [ ] Mobile responsiveness and production Core Web Vitals are measured.
- [ ] Monitoring and alerts are active.
- [ ] Owner gives final sign-off that the site is LIVE.

No deployment, production verification, paid-service configuration or final
launch sign-off was performed in this phase.
