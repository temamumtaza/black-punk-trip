# Packet 03: finance-correctness

## Objective

Read-only audit of financial calculations and persisted money semantics. Find any path that could produce an incorrect balance, settlement, or allocation.

## Context

Rupiah is represented as integer amounts. Existing `src/lib/finance.ts` tests cover basic equal/selected/custom split and settlement cases, but production readiness requires adversarial edge coverage and consistency with the database constraints.

## Sources

- `src/lib/finance.ts`
- `src/lib/finance.test.ts`
- `src/lib/types.ts`
- `src/components/expense-form.tsx`
- `src/components/settlement-view.tsx`
- `supabase/migrations/0001_black_punk_trip.sql`
- PRD sections describing split modes, balances, finalize, and mark paid.

## Ownership

Read-only. Do not edit files.

## Do

- Check rounding/remainder distribution, selected participants, custom totals, payer inclusion, duplicate allocations, zero members, invalid amounts, negative inputs, and currency formatting.
- Check ledger conservation and settlement simplification, including already-paid/finalized states and duplicate actions.
- Identify missing tests and any mismatch between UI validation, TypeScript types, SQL constraints, and pure functions.
- Run existing tests and report exact results.

## Do not

- Do not change algorithms or fixtures.
- Do not treat passing happy-path tests as proof of correctness.

## Expected output

- Findings with invariant reasoning, adversarial cases, score out of 10, and prioritized tests/fixes.

## Verification

Run safe local tests only.

## Handoff format

Return Summary, Invariants, Evidence, Blockers, Recommendations, Score, and exact files.
