# Hooks

Reusable client-side hooks.

Guidelines:

- Add `"use client"` at the top of hook files that use React state, effects or
  browser APIs.
- Keep hooks focused on UI behaviour. Data access belongs in `services/`.
- Export one hook per file, named `useSomething`.
- Document any browser-only assumptions.
