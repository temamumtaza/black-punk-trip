# Black Punk Trip — final production-readiness report

## Verdict

**PRODUCTION DEPLOYED.**

The current checkout is live on Vercel, the linked Supabase project has migrations `0001`–`0006`, and the public alias no longer serves the demo deployment. Live HTTP/browser smoke is clean. Full end-to-end confidence is still pending an authenticated two-account run and real-device PWA installation test, so I do not claim every QA scope is above `9.5` yet.

## QA score matrix

Scores are evidence scores for the current state, not aspirational targets. A scope is `>=9.5` only when the relevant behavior is proven in the target environment.

| QA scope | Score | Gate | Why |
|---|---:|---|---|
| Runtime truth / no dummy path local + live | 10.0 | PASS | Source scan and live landing/login/app smoke contain no demo fixtures, Bali markers, demo receipt, or localStorage path. |
| Auth/session/callback | 8.8 | PENDING | Live app gate and callback error redirect pass; real email/Google session establishment is not yet exercised. |
| Trip create/join/membership | 8.6 | PENDING | RPC contract is deployed; two-account RLS/persistence/reload run is unproven. |
| Expense CRUD and receipts | 8.9 | PENDING | Typed RPCs, allocation validation, private bucket, signed URLs, and deployed schema exist; real upload/edit/delete across accounts is unproven. |
| Finance/reconciliation | 9.4 | PENDING | 15 tests now include the pre-join rebuild and two-advance equal-split regressions; remote invariant health is clean, but a real two-account remote run remains absent. |
| Settlement/finalize/paid | 9.0 | PENDING | Current deployed SQL is lint-clean, locked, atomic for the stated greedy PRD algorithm, and paid-guarded; real finalized-trip/browser verification is absent. |
| Loading/error/empty/locked states | 9.2 | PENDING | Source and live public states are present; authenticated mutation-failure run is not complete. |
| Accessibility/responsive UX | 9.0 | PENDING | Labels, tabs, focus/skip/reduced-motion/touch targets and browser login smoke pass; authenticated shell/device screen-reader evidence is absent. |
| PWA/offline/privacy | 9.0 | PENDING | Live manifest, public-only SW, offline page, and headers pass; install/offline behavior was not verified on a real device. |
| Security headers/config | 9.7 | PASS | Live CSP, HSTS, frame/type/referrer/permissions headers and private `/app` caching are verified. |
| Indonesian input/profile onboarding | 9.6 | PASS | Production bundle uses `dd/mm/aaaa`, dot-grouped Rupiah inputs without a redundant preview, and Google first-name profile defaults; local regressions pass. |
| Vercel/Supabase release state | 9.8 | PASS | Vercel deployment is `READY`, alias is current, Supabase remote is `0001`–`0006`, and schema lint is clean. |

**Public production gate: PASS. Full authenticated E2E gate: PENDING.** The requested `>9.5/10` for every QA scope is not yet achieved and is not claimed.

## Verification summary

Passed locally:

- `npm test -- --run`: 3 files, 15 tests passed, including the pre-join rebuild, two-advance, join-time equal-split, and Indonesian input-format regressions.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; `/app` and `/auth/callback` are dynamic routes.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `supabase db lint --linked --level error --fail-on error`: no schema errors after migration `0004` replaced the linter-hostile temporary-table settlement implementation.
- Ephemeral PostgreSQL: `0001` + `0002` applied; fake two-user save/custom allocation/finalize/mark-paid flow passed with allocation count 2, settlement 600, and paid status.
- Local production HTTP smoke: public routes, manifest, service worker, offline page, CSP, private `/app` cache, and unauthenticated `/app` redirect marker verified.
- Runtime dummy scan: zero matches for `BALI26`, `Bali Chaos`, `demo-receipt`, `localStorage`, and related demo markers.
- Supabase remote migration list: local and remote both show `0001`, `0002`, `0003`, `0004`, `0005`, and `0006`.
- Vercel production deployment `dpl_7pHBceQwhynNjHP3XX6wxD6tUhSD`: `READY`, aliased to `https://black-punk-trip.vercel.app`.
- Live alias smoke: no demo markers; `/offline.html` 200; service worker v2; CSP/HSTS/frame headers; `/app` auth redirect marker; callback without code 307 to login error.
- Live browser smoke: current login screen has no demo link and console has no error/warning entries.
- Auth redirect configuration: Supabase Auth Site URL is `https://black-punk-trip.vercel.app`, the Vercel callback wildcard is allow-listed, and the Auth settings endpoint reports both email and Google providers enabled. The app's email/Google redirect targets are derived from the current browser origin.
- Read-only Google authorize probe with `redirect_to=https://black-punk-trip.vercel.app/auth/callback` returned HTTP 302 to `accounts.google.com` with no redirect error.
- Migration `0005_google_first_name_profiles.sql` applies Google first-name defaults for new profiles and backfills only legacy generated Google names, preserving explicit email nicknames.
- Live `/signup` DOM includes `Nama panggilan` and `Lanjut dengan Google`; live `/login` DOM is clean, and the browser console returned no errors or warnings.
- Migration `0006_rebalance_equal_expenses_on_join.sql` is applied; the deployed join RPC calls the rebalancer and a read-only remote invariant query reports zero active equal expenses out of sync with current membership.

Remaining unproven:

- Authenticated email/Google flow, two-user RLS, receipt storage access, full CRUD, finalization lock, and sign-out invalidation were not run against the target environment.
- PWA installation and offline behavior on a real browser/device remain unverified.

## Required release sequence

1. Run a two-account authenticated browser gauntlet on the live deployment: create/join, equal/selected/custom expense, receipt upload/signed read, edit/delete permissions, finalize/lock, mark paid, refresh/deep links, and sign out.
2. Verify PWA installation and offline navigation on a real mobile browser without exposing private trip data.

The remote migration and production deployment actions are complete. Only the authenticated/device verification still needs a real test account/session.
