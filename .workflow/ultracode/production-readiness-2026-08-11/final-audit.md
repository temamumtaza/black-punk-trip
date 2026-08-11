# Black Punk Trip — final audit evidence

## Source and quality gates

| Check | Result | Evidence |
|---|---|---|
| Runtime dummy/localStorage scan | PASS | Zero matches in runtime `src`, `public`, `supabase` scan for demo/Bali/localStorage markers. |
| Unit/component tests | PASS | `npm test -- --run`: 3 files, 15 tests, including the pre-join equal expense rebuild, Rp1.500.000 + Rp4.500.000 equal-split, and Indonesian input-format regressions. |
| Lint | PASS | `npm run lint` exit 0. |
| Typecheck | PASS | `npx tsc --noEmit` exit 0. |
| Production build | PASS | `npm run build` exit 0; dynamic `/app`, `/auth/callback`, proxy present. |
| Runtime dependency audit | PASS | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities. |
| Linked schema lint | PASS | `supabase db lint --linked --level error --fail-on error`: no schema errors after remote migrations `0001`–`0006`. |
| Join-time equal-split invariant | PASS | Migration `0006` locks the trip, inserts the new member, and rebuilds only `equal` allocations in one transaction; remote function inspection confirms the join RPC calls the rebalancer, and a read-only health query reports 0 active equal expenses out of sync. |
| Production input/profile changes | PASS | Expense/trip dates use `dd/mm/aaaa` in the UI and convert to ISO before persistence; Rupiah inputs format with `.` separators; Google-created profiles prefer the first name while explicit email nicknames remain intact. |
| Auth redirect configuration | PASS / E2E PENDING | `supabase config push --yes` set the production Site URL and Vercel callback allow-list; the public Auth settings endpoint returns email and Google enabled. Actual account creation/OAuth completion remains unsubmitted. |
| Google redirect allow-list probe | PASS / E2E PENDING | Supabase authorize request with `redirect_to=https://black-punk-trip.vercel.app/auth/callback` returned HTTP 302 to `accounts.google.com` without a redirect error; no account was authenticated. |

## Ephemeral database contract

An isolated temporary PostgreSQL instance with stubbed `auth`/`storage` schemas applied the original production workflow migration and completed a fake two-user flow: create trip, join member, save custom expense with two allocations and a trip-scoped receipt path, finalize, and mark paid. Observed output: `allocation_count=2`, settlement amount `600`, status `paid`, receipt bucket limit `8388608`, and the allowed image MIME list. The later array-based `0004` implementation is additionally verified by remote schema lint. No remote user/data state was changed by this check.

## Local production HTTP smoke

Against `npm start -- -p 3101`:

- `/`, `/login`, `/signup`, `/manifest.webmanifest`, `/sw.js`, `/offline.html`: HTTP 200.
- `/` and `/login`: current output contains no old demo markers and includes CSP.
- `/sw.js`: current public-shell cache key `black-punk-trip-public-shell-v2`; no `/app` document precache.
- `/app?view=detail&trip=missing&expense=missing`: response body includes Next `NEXT_REDIRECT` to `/login?...`, private no-store cache policy, and no demo marker.
- `/offline.html`: current honest offline copy is served.

## Remote release evidence

Linked migration check after the authorized production push:

```text
local 0001 -> remote 0001
local 0002 -> remote 0002
local 0003 -> remote 0003
local 0004 -> remote 0004
local 0005 -> remote 0005
local 0006 -> remote 0006
schema lint: No schema errors found
```

Read-only live alias check:

| URL | Result |
|---|---|
| `/` | 200; no demo markers; CSP/HSTS/frame headers present |
| `/login` | 200; current login UI; no demo link; browser console clean |
| `/app` | private no-store; unauthenticated response contains `NEXT_REDIRECT` to login |
| `/sw.js` | 200; current `black-punk-trip-public-shell-v2`, no private app precache |
| `/offline.html` | 200; honest offline page |
| `/auth/callback` | 307 to `/login?error=auth_callback`; `no-store` |

Post-change public browser smoke on the promoted alias:

- `/signup` visibly contains `Nama panggilan` and `Lanjut dengan Google`.
- `/login` visibly contains the production login form and Google action.
- Browser console returned no errors or warnings on the checked auth pages.
- The current user tab was left on `https://black-punk-trip.vercel.app/signup`.
- The post-fix Vercel deployment `dpl_7pHBceQwhynNjHP3XX6wxD6tUhSD` is `READY` and aliased to `https://black-punk-trip.vercel.app`.

## Unproven checks

- Real email sign-up/sign-in and Google OAuth callback against the configured Supabase project.
- Two independent accounts and RLS isolation across trips/profiles/receipts/expenses/settlements.
- Receipt upload, signed read, failed-save cleanup, and private access in the target project.
- Authenticated mobile PWA installation and offline navigation on a real browser/device.
- Authenticated post-migration/post-deploy smoke on the exact promoted Vercel deployment.

## Release decision

The production deployment and remote migrations are complete and public smoke is passing. The release is live, while authenticated two-user E2E and real-device PWA installation remain the final evidence gaps before claiming a universal `>9.5/10` QA score.
