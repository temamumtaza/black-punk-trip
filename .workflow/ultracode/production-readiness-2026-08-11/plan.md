# Black Punk Trip production-readiness audit

## Goal

Audit, harden, and complete Black Punk Trip so it is a real end-to-end PWA backed by the linked Supabase project, with no dummy runtime data or misleading demo UI, and with every QA scope supported by evidence targeting `>9.5/10`.

## Success criteria

- Real Supabase auth/session and Google OAuth callback work without exposing secrets.
- Real persisted trip, membership, expense, allocation, settlement, finalization, and paid-state flows work under RLS.
- Production UI has intentional loading, error, empty, permission, locked, and offline states; fixture data is not used as default product data.
- Calculation invariants are tested, including rounding, custom allocations, zero/invalid totals, settlement conservation, and finalized-trip guards.
- PWA, accessibility, responsive layout, security, deployment configuration, and operational failure behavior are checked.
- Final audit distinguishes proven behavior from blocked external checks; no score is inflated to meet the target.

## Current context

- Repository: `/Users/temamumtaza/webdev/black-punk-trip`.
- Next.js 16 App Router + TypeScript + Tailwind 4; Supabase SSR/browser clients and migration already exist.
- Vercel project and Supabase project are linked, but the app was previously identified as demo/localStorage-first for trip and expense mutations.
- Existing finance tests/build/lint passed before this audit; no Git repository is present (`baseline_ref: no-git`).
- `DESIGN.md` and `BLACK PUNK TRIP — GAUNTLET LOOP PRD.md` are the product/design source of truth.

## Constraints

- Never expose Supabase secrets, service-role keys, access tokens, or user data in artifacts or output.
- Preserve the existing design language; do not replace it with generic dashboard styling.
- Do not delete user files, reset history, deploy, or mutate production data without explicit approval.
- Local schema/code changes may be made and tested; remote migration/deployment is a separate approval gate.
- The parent integrates changes; read-only agents must not edit shared files.

## Risk level

High: auth, RLS, financial calculations, persistence, public PWA, and production release behavior all intersect.

## Approval gates

- Agent fan-out is explicitly requested and approved by the user; use four read-only agents and reuse them for review.
- Local implementation, tests, and workflow artifacts are authorized.
- Production database writes, destructive migrations, credential changes, and Vercel deployment are not assumed authorized by this audit request; stop before those actions and report the exact gate.

## Mode

Delegated Ultracode workflow. Four bounded read-only explorer packets in wave 1; parent-owned implementation; one independent review wave reusing the same agents.

## Work packets

1. `01-data-auth-backend`: trace Supabase schema/RLS/auth/session/repository gaps and identify the minimum production data layer.
2. `02-product-flow-ux`: compare every PRD/design flow with actual routes/components, find dummy UI/data and UX/accessibility gaps.
3. `03-finance-correctness`: audit finance functions, invariants, edge cases, and test coverage for expense/settlement correctness.
4. `04-deploy-security-pwa`: audit Vercel/Supabase config, PWA, error boundaries, headers, dependency/runtime risk, and browser/HTTP checks.

## Eval contract

See `eval-contract.md` (full contract; cross-surface auth, schema, UI, and financial data changes).

## Integration policy

Read all agent result notes, verify claims against source, implement on the parent critical path, and reject recommendations without evidence. Agents do not edit source in wave 1. Review wave may only report regressions; parent remains the sole integrator.

## Verification plan

1. Baseline source scan and existing test/build checks.
2. Wave 1 independent audit.
3. Parent implementation in bounded slices with focused tests.
4. Wave 2 independent review of the changed state.
5. Full tests, lint, typecheck, build, HTTP/browser/PWA smoke, source scan, and final score matrix.

## Completion criteria

Complete only if all blocking conditions in `eval-contract.md` are cleared and required checks have evidence. If external auth, RLS, or production configuration remains unverified, mark the run incomplete or blocked rather than calling it production-ready.

## Final plan state

- Baseline and four-packet fan-out: completed.
- Parent integration and local hardening: completed.
- Independent review wave 2: completed; all four packets returned below the `9.5` gate and were reconciled against the final parent source.
- Local verification: completed and passing, including tests, lint, typecheck, build, dependency audit, linked-schema lint, source scan, HTTP smoke, and ephemeral SQL contract flow.
- Remote release verification: completed. Supabase migrations `0001`–`0004` are applied and lint-clean; Vercel production alias is current and public smoke passes.
- Run status: deployed; authenticated two-account E2E and real-device PWA verification remain pending before universal `>9.5/10` claims.
