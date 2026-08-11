# Packet 04: deploy-security-pwa

## Objective

Read-only release audit covering Vercel configuration, Supabase environment boundaries, PWA behavior, security headers, error handling, dependencies, and deploy smoke evidence.

## Context

The app has previously been deployed to Vercel and has a linked Supabase project. This packet must distinguish code evidence, local evidence, and external production evidence.

## Sources

- `package.json`, `next.config.ts`, `tsconfig.json`, `.env.example`, `.gitignore`
- `src/proxy.ts`, `src/app/error.tsx`, `src/app/loading.tsx`, `src/app/manifest.ts`, `src/components/pwa-register.tsx`
- `public/sw.js`, `public/icons/*`
- `README.md`, Supabase config/migration, Vercel metadata if present

## Ownership

Read-only. Do not edit files or remote config.

## Do

- Inspect secret exposure, environment fallback, auth cookie/session handling, RLS assumptions, security headers, CSP/caching risks, dependency scripts, and error boundaries.
- Check service-worker cache strategy and whether it can serve stale/private authenticated content.
- Run safe `npm` checks and HTTP smoke checks if available. Do not log secrets.
- Score release/PWA/security readiness out of 10, with exact evidence and blockers.

## Do not

- Do not deploy, mutate Vercel/Supabase, install global packages, or edit files.

## Expected output

- Release checklist, evidence, blockers, risk ratings, recommended fixes, and score.

## Verification

Use local source inspection and safe HTTP checks only; label external settings not verifiable from the repo.

## Handoff format

Return Summary, Evidence, Blockers, Recommendations, Score, and exact files/commands.
