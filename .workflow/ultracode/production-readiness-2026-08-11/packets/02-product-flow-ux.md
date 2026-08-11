# Packet 02: product-flow-ux

## Objective

Read-only audit of every PRD/design user flow and actual UI behavior, with focus on whether the product feels like a real production app rather than a static demo.

## Context

Use `BLACK PUNK TRIP — GAUNTLET LOOP PRD.md` and `DESIGN.md` as source of truth. The requested target is an end-to-end PWA with no dummy data or dummy-looking runtime screens.

## Sources

- `BLACK PUNK TRIP — GAUNTLET LOOP PRD.md`
- `DESIGN.md`
- `src/app/*`
- `src/components/*`
- `src/app/globals.css`
- `public/*`

## Ownership

Read-only. Do not edit files.

## Do

- Map auth → my trips → create/join → trip home → expense create/edit/detail → members → settlement/review/finalize flows.
- Find fixture content, demo links, hard-coded identities, fake success messages, broken navigation, missing loading/error/empty/permission states, and accessibility issues.
- Check mobile/PWA interaction risks: sticky nav, keyboard/focus, touch targets, responsive overflow, service worker, install metadata.
- Score each major UX scope independently and name the single biggest gap.

## Do not

- Do not edit files or use production data.
- Do not score visual polish above functional truth.

## Expected output

- Flow matrix with evidence, blockers, priority fixes, independent scores, and a concrete path to `>9.5`.

## Verification

Use source inspection and safe local/browser inspection if available; label unverified behavior.

## Handoff format

Return Summary, flow matrix, Evidence, Blockers, Recommendations, Scores, and exact files.
