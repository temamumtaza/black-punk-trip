# Integration decision log

## Run

- Product: Black Punk Trip
- Audit: production readiness / end-to-end PWA
- Date: 2026-08-11
- Mode: Ultracode delegated, four bounded explorers, two review waves
- Baseline: no Git metadata in checkout
- Safety boundary during the initial audit: no Vercel deployment or remote Supabase migration until explicitly authorized. The user later authorized both actions.

## Accepted parent changes

1. Replaced the demo/localStorage runtime with authenticated Supabase state loading and typed repository/RPC mutations.
2. Added a server auth gate for `/app`, safe OAuth callback path validation, real sign-out, and callback error copy.
3. Added migration `0002_production_workflows.sql` with authenticated RPC writes, trip locking, allocation/payer/member validation, atomic finalization, finalized-trip paid guard, server timestamps, profile visibility restriction, and receipt bucket constraints.
4. Added safe integer, identity, allocation reconciliation, ledger conservation, and malformed-review guards; the test suite now passes 13 tests.
5. Added loading/error/empty/not-found/locked/busy states, URL-addressable trip/expense state, signed receipt URLs, accessible split tabs, skip navigation, touch-target normalization, reduced-motion handling, and honest offline behavior.
6. Added security headers, private/no-store authenticated caching, public-shell-only service-worker caching, generated PWA manifest, and owner-only `.env.local` permissions.

## Review-wave decisions

| Packet | Wave-2 score | Parent decision |
|---|---:|---|
| Data/auth/backend | 7.2 | Source issues fixed where verified; external migration/RLS/browser gate remains open. |
| Product flow/UX | 8.2 | Stale findings resolved in current source; authenticated and installed-PWA behavior remains unproven. |
| Finance correctness | 8.2 | Numeric/locking/payment fixes retained; greedy settlement is the algorithm specified by the PRD, not replaced with a different product contract. |
| Deploy/security/PWA | 5.0 | External failures remain release blockers; local headers/storage/PWA fixes verified. |

## Evidence-based rejection of premature completion

The app must not be called production-ready while the intended live alias serves the old demo and the linked Supabase project lacks `0002`. A green local build cannot prove remote RLS, Google OAuth callback configuration, private receipt access, two-user permissions, or installed-PWA behavior. The final report therefore records the run as incomplete rather than inflating every scope to the requested threshold.

## Current release gates

- Local candidate source: materially hardened and statically/build verified.
- Remote database: **PASS** after migrations `0001`–`0006`; linked schema lint reports no errors.
- Vercel release: **PASS**; deployment `dpl_784UAambBqgF91x6pNes9EbsZYgd` is `READY` and aliased to `https://black-punk-trip.vercel.app`.
- Authenticated E2E: **unproven**; requires staging/test accounts and a real browser session.

## Post-approval execution

- `supabase db push --linked --yes` applied `0002`, then `0003`, then `0004` to the linked production project.
- `0003` was a temporary-table lint correction; `0004` replaced the settlement working table with PL/pgSQL arrays after remote lint identified the same relation issue in dynamic SQL.
- `supabase db lint --linked --level error --fail-on error`: **No schema errors found** after `0004`.
- `vercel deploy --prod --yes` completed with `READY` status and the intended alias.
- Live HTTP and in-app browser smoke verified current no-demo UI, headers, PWA assets, auth gate, and callback behavior; browser console returned no errors/warnings.
- `supabase config push --yes` set Auth `site_url` to `https://black-punk-trip.vercel.app` and allow-listed the Vercel callback wildcard while restoring the previous production email/MFA settings. The app keeps using `window.location.origin` for email and Google callback targets.

## Follow-up correction and release

- Added Indonesian `dd/mm/aaaa` input formatting with strict calendar validation and ISO conversion at the persistence boundary.
- Added automatic dot-grouped Rupiah inputs without a redundant secondary amount preview, including custom per-member allocations.
- Added a finance regression for two equal-split advances of Rp1.500.000 and Rp4.500.000: each member's share is Rp3.000.000, with balances -Rp1.500.000 and +Rp1.500.000.
- Added Supabase migration `0005_google_first_name_profiles.sql`; new Google profiles prefer the first name from `full_name`/`name`, and legacy generated Google names are narrowed to first names without replacing explicit email nicknames.
- `supabase db push --linked --yes` applied `0005`; linked migrations `0001`–`0005` match and schema lint remains clean.
- `vercel deploy --prod --yes` produced `dpl_FUnN8FAsSVvXJ5rBmh4uFo3CA3GM` with `READY` status and the production alias `https://black-punk-trip.vercel.app`.
- Post-deploy `/signup` and `/login` DOM smoke passed with no browser console errors/warnings. Authenticated two-user E2E remains intentionally unclaimed because no test credentials were supplied.

## Join-time equal-split correction

- Root cause confirmed: stored allocations were created from the membership list at expense-save time, while the old join RPC only inserted `trip_members` and never rebuilt existing `equal` allocations.
- Migration `0006_rebalance_equal_expenses_on_join.sql` adds a non-client-executable security-definer rebalancer, repairs all active trips once, and replaces `join_trip_by_invite` with a trip-row-locked transaction that inserts the new member before recalculating every `equal` expense across the current member set.
- `selected_equal` and `custom` are deliberately left untouched because their participant sets/amounts are explicit user choices.
- The remote join function source was inspected read-only and confirmed to call the rebalancer. A read-only invariant query found `0` active `equal` expenses out of sync with their current trip membership.
- Local test suite now passes 15 tests, including the pre-join expense rebuild and 2-member-to-3-member equal re-split cases. Vercel production deployment `dpl_7pHBceQwhynNjHP3XX6wxD6tUhSD` is `READY`.
