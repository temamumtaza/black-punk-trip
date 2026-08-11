# Result 03: finance-correctness

## Summary

Finance readiness: **3/10**. Normal valid inputs work, but validation and persistence boundaries are not production-safe.

## Invariants

- Holds: deterministic remainder distribution, payer-minus-share ledgers, self-allocation, and settlement matching for valid ledgers.
- Fails: individual allocation integer/non-negative validation, duplicate participant rejection, and conservation checking for settlement input.

## Evidence

- `src/lib/finance.ts:16` validates only allocation total.
- Probes found `allocationsReconcile(100, [-50,150]) === true`, fractional allocations accepted, duplicate IDs breaking `buildAllocations`, non-conserving ledgers producing unresolved balances, and duplicate ledger IDs allowing self-transfer.
- `src/components/expense-form.tsx:33` handles normal digit input but not identity/safe-integer boundaries.
- `src/lib/finance.test.ts:25` and `src/components/expense-form.test.tsx:15` cover seven happy-path tests only.
- `supabase/migrations/0001_black_punk_trip.sql:54` has basic constraints but no allocation sum/trip-membership invariant.

## Blockers

1. Production finance remains local-only.
2. SQL does not enforce allocation sum or trip membership.
3. Settlement writes are not atomic/idempotent.
4. Pure validation accepts negative/fractional allocations and duplicates.
5. Review/finalize UI is not role-gated independently of client state.

## Recommendations

- Add shared runtime validation for safe integer, finite, non-negative, unique participants and valid references.
- Use transactional RPCs for expense save, finalization, and paid-state changes.
- Restrict settlement transition to pending → paid and set timestamps server-side.
- Add adversarial tests and conservation assertions.

## Score

3/10.

## Verification run

- `npm test -- --reporter=verbose`: passed, 2 files / 7 tests.
- `npm run lint`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- Adversarial probes were in-memory only; no remote state changed.

## Handoff

- Summary: finance needs both pure-function hardening and a transactional persistence boundary.
- Changed surfaces: none (read-only packet).
- Contracts satisfied: invariant and adversarial evidence supplied.
- Risks: local tests cannot prove Supabase RLS or transaction behavior.

## Review wave 2 and parent reconciliation

Wave 2 score from Heisenberg: **8.2/10 — FAIL**. The report identified settlement minimality, concurrency, numeric boundaries, and SQL evidence gaps. Parent reconciliation:

- The PRD explicitly defines the repeated debtor/creditor greedy matching algorithm; it is implemented consistently in TypeScript and SQL. The report's global-minimum counterexample is therefore a product-choice note, not a regression against the stated PRD contract.
- Trip-row locking is present in the current `save_expense` and `delete_expense` paths, and finalized-trip payment is guarded in the current migration.
- Safe-integer and allocation identity checks are present in `finance.ts`, the repository, and the expense form; the test suite now has **10 passing tests**.
- A fresh ephemeral PostgreSQL run applied `0001` + `0002` and completed a fake two-user create/join/save-custom-expense/finalize/mark-paid flow without touching remote data.

The packet still does not claim `>=9.5`: the ephemeral run is a narrow local contract check, not proof of remote RLS/concurrency or a real multi-browser financial run.
