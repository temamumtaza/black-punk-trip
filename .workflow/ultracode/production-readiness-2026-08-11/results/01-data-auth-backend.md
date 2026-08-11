# Result 01: data-auth-backend

## Summary

Backend/auth readiness: **2/10**. Supabase schema and auth scaffolding exist, but core trip, expense, settlement, finalization, and receipt flows remain demo/localStorage-only.

## Evidence

- `src/components/trip-app.tsx:28-48,73-126` initializes demo data, hydrates/writes localStorage, and performs all mutations in memory.
- `src/components/auth-form.tsx:28-69` is the only real Supabase use; no repository, `.from()`, `.rpc()`, or Storage data path exists.
- `src/app/app/page.tsx:14-17` renders the app without an authenticated-user gate.
- `src/proxy.ts:4-22` refreshes a session but does not redirect unauthenticated users.
- `src/components/trip-app.tsx:120-122` signs out by navigation only, not `auth.signOut()`.
- `src/lib/supabase/database.ts:1-12` uses placeholder `Record<string, unknown>` types.
- `src/components/expense-form.tsx:69-93` stores only a `demo-receipt://` filename; private Storage is not used.

## Blockers

- No real persistence and identity/session mismatch with demo user `andi`.
- Existing RLS does not enforce payer membership, allocation membership/sum, or restricted settlement updates; finalized trips can be reopened through the broad admin update policy.
- No atomic finalization transaction.
- OAuth callback safe-path validation accepts a backslash form that can resolve externally.

## Recommendations

1. Gate `/app`, use the authenticated UUID, and implement real sign-out.
2. Replace `TripApp` persistence with Supabase query/RPC repository functions.
3. Harden SQL/RLS and make expense save/finalization/paid-state atomic.
4. Generate real database types and upload receipts to private Storage.
5. Add multi-user RLS, reload persistence, finalization race, and receipt access tests.

## Score

2/10.

## Verification run

- `npm test`: 2 files / 7 tests passed.
- `npm run lint`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- Remote RLS/auth behavior was not independently proven.

## Handoff

- Summary: backend is the primary production blocker.
- Changed surfaces: none (read-only packet).
- Contracts satisfied: evidence and blocker inventory supplied.
- Assumptions: current checkout and linked project state are as described in the packet.
- Local checks: listed above.
- Integration evidence: parent source scan independently confirms dummy/localStorage path.
- Risks: remote config/RLS still needs a safe migration and authenticated two-user verification.

## Review wave 2 and parent reconciliation

Wave 2 score from Kepler: **7.2/10 — FAIL**. The report was produced before the final parent verification pass and correctly kept the external Supabase gate open. The parent rechecked the reported source-level issues:

- `save_expense` and `delete_expense` now lock the active trip row before checking or mutating it.
- `mark_settlement_paid` now requires the trip to be finalized and sets `paid_at` server-side.
- Receipt bucket limits/MIME types are declared in `0002`; repository validation also rejects unsupported files before upload.
- Current source contains typed RPC/repository paths and no demo/localStorage runtime path.

The remaining backend release blockers are external, not silently accepted: linked Supabase reports local `0002` with remote missing, and no authenticated two-user/RLS/browser run was authorized or performed. Therefore this packet remains below the production gate even though local source hardening is materially complete.
