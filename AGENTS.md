<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Shundori project conventions

- The project is now at Phase 10. The current work is a storefront UI/UX
  redesign and must stay in the presentation layer only.
- Do not change logic in `services/`, `supabase/`, `lib/checkout-*`,
  `lib/order-*` or `types/`. Ask the project owner before any schema or data
  change.
- Use Server Components by default; add `"use client"` only for interactivity.
- Keep data access in `services/`; never fetch directly in presentational
  components.
- Supabase clients: `lib/supabase/client.ts` (browser), `server.ts` (RLS,
  per-request) and `admin.ts` (service role, trusted server code only).
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or prefix it with `NEXT_PUBLIC_`.
- Store money as integer poisha; format with `utils/format.ts`.
- The official Shundori green/sage palette and its tokens live in
  `app/globals.css`: forest, forest-soft, leaf, sage, sage-light, mist, cream,
  lime and ink-soft. Page backgrounds use mist, cards use cream, primary text
  uses forest, body copy uses ink-soft, links use leaf, and cart badges use lime
  with forest text. Shadows are green-tinted. Do not add hardcoded brand colors
  in components.

