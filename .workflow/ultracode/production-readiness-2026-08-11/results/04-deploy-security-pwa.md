# Result 04: deploy-security-pwa

## Summary

Release readiness: **4/10** for real-data production. Basic routes/PWA assets/dependencies are mostly healthy, but current source was changing during the audit and the release gates were not yet stable.

## Evidence

- `.env.example` documents only public Supabase variables; `.gitignore` excludes env files and `.vercel`. No service-role key was found in source/public/build. Local OIDC token exposure was observed in `.env.local` permissions; value was withheld.
- `src/proxy.ts` refreshes sessions but does not enforce `/app` authentication. Unauthenticated HTTP can still receive the app shell.
- `src/app/auth/callback/route.ts` now checks same-origin callback paths.
- `supabase/migrations/0002_production_workflows.sql` adds authenticated RPC writes, but remote application was not verified in this packet.
- `next.config.ts` has no security headers; local responses lacked CSP, HSTS, frame, MIME, referrer, and permissions headers.
- `public/sw.js` precaches `/app?view=home`; private navigation caching needs a safer public-shell-only strategy.
- `npm audit` reported 0 vulnerabilities; `npm ls` reported extraneous packages and `package-lock.json` still names the scaffold package.

## Blockers

- At audit time, concurrent edits caused a temporary `initialJoinCode`/lint failure; parent must rerun fresh gates after integration.
- Remote migration 0002 status is unknown until explicitly verified/applied.
- Server-side `/app` authorization defense-in-depth is missing.
- Security headers, authenticated cache policy, server-side upload MIME validation, and generic error mapping are incomplete.
- No Git metadata exists for history/secret audit.

## Recommendations

1. Stabilize source and rerun typecheck/build/lint.
2. Add server-side `/app` auth enforcement and fail closed without env.
3. Verify migration 0002 remote state before release; restrict legacy RPC/direct policies.
4. Add security headers and `private, no-store` behavior for authenticated surfaces.
5. Cache only public shell assets in the service worker.
6. Map backend errors to safe user messages and validate receipt MIME/size server-side.
7. Add secret scanning/CI gates and clean lockfile metadata.

## Score

4/10.

## Verification run

- `npm audit --json`: 0 advisories.
- HTTP smoke: public routes/manifest/service worker 200; callback without code 307; missing route 404.
- Local Supabase lint unavailable because PostgreSQL was not running.
- `npm run lint` / typecheck were transiently affected by concurrent parent edits and require fresh post-integration evidence.

## Handoff

- Summary: release hardening remains after core persistence work.
- Changed surfaces: none (read-only packet).
- Contracts satisfied: source/config evidence and external-verification limits supplied.
- Risks: remote config and target-device PWA/install behavior remain unproven.

## Review wave 2 and parent reconciliation

Wave 2 score from Meitner: **5.0/10 — FAIL**. The external findings remain valid for the release target:

- `https://black-punk-trip.vercel.app` is still the older demo deployment: the landing response contains `Bali Chaos`/`demo trip`, `/app` contains `BALI26`, `offline.html` is `404`, and the live service worker is not the current v2 worker.
- `supabase migration list --linked` still reports local `0002` with remote missing; `supabase db push --linked --dry-run` says it would push `0002_production_workflows.sql`.
- `.env.local` has since been corrected to owner-only mode `600`; its values were never printed or copied into workflow artifacts.
- Local production smoke now confirms CSP/security headers, private `/app` caching, current manifest/offline page, and public-shell-only service-worker behavior.
- Receipt type/size restrictions now exist both in repository validation and the `storage.buckets` migration configuration.

The release gate remains failed until the user approves remote migration/deployment and an authenticated browser run validates the exact resulting environments.
