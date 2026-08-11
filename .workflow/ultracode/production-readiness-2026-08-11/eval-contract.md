# Eval contract

## Goal

Menilai dan memperbaiki Black Punk Trip agar seluruh flow PRD dapat dipakai end-to-end dengan data Supabase nyata, tanpa dummy runtime, tanpa localStorage sebagai persistence utama, dan dengan bukti QA production yang dapat diulang.

## Success criteria

- User dapat sign up/sign in/Google OAuth, membuat trip, mengundang atau join trip, dan melihat hanya trip yang memang boleh diakses.
- User dapat membuat, mengedit, menghapus, dan membaca expense dengan equal, selected, dan custom allocation; jumlah allocation selalu reconcile ke total Rupiah.
- Settlement dihitung dari data tersimpan dan admin dapat review/finalize/mark paid dengan guard yang aman.
- UI tidak memakai fixture/demo sebagai data default dan tidak menampilkan status seolah-olah sudah tersimpan remote ketika belum.
- RLS, auth session, error state, loading state, empty state, accessibility, PWA install/runtime, dan deployment health punya evidence.

## Integration surfaces

- `supabase/migrations/0001_black_punk_trip.sql` dan database types.
- `src/lib/supabase/*`, `src/proxy.ts`, auth callback, dan session lifecycle.
- `src/lib/types.ts`, `src/lib/finance.ts`, data repository/hooks, dan seluruh `src/components/*`.
- `src/app/*`, PWA assets, environment variables, Vercel build/deployment configuration.

## Downstream consumers

- Auth pages consume Supabase browser auth and callback session.
- Trip, expense, members, and settlement screens consume repository queries/mutations.
- Finance UI consumes allocation and settlement functions.
- RLS policies enforce the same permissions server-side regardless of UI.

## Required checks

- `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Static scan proving no runtime use of demo fixtures/localStorage for production flows.
- Focused tests for auth/session boundary, repository validation, allocation reconciliation, settlement, and authorization assumptions.
- Browser or HTTP smoke for public routes, auth callback behavior, authenticated route behavior, and PWA manifest/service worker.
- Independent review pass after fixes.

## Deliverables

- Production-readiness implementation in the application source and migrations where needed.
- Workflow artifacts: plan, packets, results, integration decision log, final report, and final audit.
- Explicit list of passed, failed, skipped, and unproven checks.

## Blocking conditions

- Any dummy data or demo-only mutation remains on the production path.
- Any write path bypasses authenticated Supabase/RLS enforcement or can silently lose data.
- Critical end-to-end flow is only visually present but not connected to persisted data.
- A required check fails, or an external configuration cannot be verified and is required for the claim.
