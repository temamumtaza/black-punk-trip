# Packet 01: data-auth-backend

## Objective

Read-only audit of the real Supabase/auth/data path. Determine exactly what prevents an authenticated user from completing the core trip/expense/settlement flows against persisted data.

## Context

The app currently has a Supabase migration, SSR/browser clients, and auth callback, but the previous handoff stated that trip and expense mutations still use demo/localStorage behavior.

## Sources

- `supabase/migrations/0001_black_punk_trip.sql`
- `src/lib/supabase/*`
- `src/proxy.ts`
- `src/app/auth/callback/route.ts`
- `src/components/trip-app.tsx`, `trip-shell.tsx`, `trip-form-view.tsx`, `expense-form.tsx`, `settings-view.tsx`
- `src/lib/types.ts`, `src/lib/demo-data.ts`

## Ownership

Read-only. Do not edit files.

## Do

- Trace auth, session refresh, user/profile, trip membership, expense/allocation, settlement, finalization, and paid-state paths.
- Verify policy intent against UI actions and identify missing server-side protections or race conditions.
- Identify all dummy/localStorage persistence and propose a bounded real repository/API shape.
- Cite exact file paths and line numbers where possible.

## Do not

- Do not modify source, migrations, credentials, or remote Supabase state.
- Do not claim RLS/auth behavior is proven without a runnable evidence path.

## Expected output

- Summary and score out of 10 for backend/auth readiness.
- Evidence, blockers, recommended parent implementation order, and tests needed.

## Verification

Run read-only inspection and any safe local tests; do not run production writes.

## Handoff format

Return concise findings with Summary, Evidence, Blockers, Recommendations, Score, and exact files.
