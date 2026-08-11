# Result 02: product-flow-ux

## Summary

UX/release gate: **FAIL**. The visual system is coherent, but the runtime is a local demo, not a real product flow.

## Flow matrix

- Auth/session: blocked — demo bypass, no protected app entry, navigation-only sign-out.
- My Trips/create/join: local-only; invalid join is silent and the join form instructs a demo code.
- Trip home/navigation: summary is clear, but review CTA routes incorrectly and mobile navigation omits review/settings.
- Expense creation/splitting: local split interaction works; production persistence and receipts are absent.
- Detail/edit/permissions: React-only selection and client-only permissions; refresh/deep link is unreliable.
- Members/balances: clear presentation from fixture state, not database truth.
- Settlement/review/finalize: local preview only; no durable finalization or paid timestamp.
- Loading/error/empty: important async failures are silent or absent.
- Accessibility: labels lack `htmlFor`/IDs, split semantics/live feedback are incomplete, hidden file input is not keyboard-friendly, and key controls are below 44px.
- Responsive/PWA: basic shell is present, but 768px breakpoint differs from DESIGN and offline/install behavior is unverified.

## Evidence

- `src/components/trip-app.tsx` uses `createDemoState`, localStorage, and demo banner.
- `src/lib/demo-data.ts` contains hard-coded profiles, trip, invite code, and expenses.
- `src/components/trip-form-view.tsx` previously advertised a demo code and had no invalid-code feedback.
- `src/components/settings-view.tsx` exposed a non-routable hard-coded invite URL pattern.
- `public/sw.js` caches only a small shell and falls back to the marketing page; no offline indicator/draft recovery.
- Browser checks found local routes render, but no authenticated submit/upload/finalize path was proven.

## Blockers

1. Replace demo runtime with persisted domain data.
2. Protect `/app` and enforce server-backed permissions.
3. Make finalization durable and atomic.
4. Complete join/create feedback, deep-link state, and receipt storage.
5. Repair form accessibility, target sizes, and offline behavior.

## Recommendations

- Keep no implicit fixture path in production `/app`.
- Encode trip/expense state in URLs and handle missing records.
- Test multiple users against staging Supabase: create, join, payer ≠ creator, all split modes, receipt, settlement, finalize, lock, and paid.
- Add browser assertions for invalid join, duplicate submit, refresh/edit, unauthorized edit, finalized lock, and offline.

## Scores

| Scope | Score | Biggest gap |
|---|---:|---|
| Auth/session | 3.0 | Demo bypass and no app guard |
| Trips/create/join | 4.0 | Local state and silent invalid join |
| Home/navigation | 6.0 | Review path/mobile navigation |
| Expense/splitting | 6.5 | Persistence and receipt storage |
| Detail/permissions | 4.5 | React-only selection/permissions |
| Members/balances | 5.5 | No database truth |
| Settlement/finalize | 5.0 | No durable finalization |
| Loading/errors | 4.0 | Silent mutation failures |
| Accessibility | 4.0 | Labels/semantics/targets |
| Responsive/mobile | 6.5 | Breakpoint and touch gaps |
| PWA/offline | 4.0 | Basic shell only |
| Design fidelity | 7.0 | Strong visual base, mixed language/breakpoint |

## Verification run

- `npm run lint`: passed.
- `npm test`: passed, 2 files / 7 tests.
- `npm run build`: passed.
- Local route/browser checks were performed without real auth, upload, or finalization.

## Handoff

- Summary: backend and truthfulness are the release blockers; the visual base is reusable.
- Changed surfaces: none (read-only packet).
- Contracts satisfied: flow matrix and independent scoring supplied.
- Risks: real Supabase and target-device PWA behavior remain unverified.

## Review wave 2 and parent reconciliation

Wave 2 score from Mendel: **8.2/10 — FAIL**. Several findings were caught while the parent was still completing the final patch set. Current source recheck confirms these parent fixes: expense IDs are URL-addressable, invalid requested trips render an intentional not-found state, paid timestamps and mutation busy states are visible, callback errors are surfaced, settlement preview errors are guarded, split controls have tab semantics, touch targets are normalized, skip navigation/reduced-motion handling exist, and the service worker does not cache `/app`.

The remaining UX/PWA score is intentionally below `9.5` because authenticated CRUD, Google callback, receipt access, and installed-PWA/offline behavior were not exercised in a real authenticated browser. The stale live Vercel alias also cannot be treated as evidence for the current source.
