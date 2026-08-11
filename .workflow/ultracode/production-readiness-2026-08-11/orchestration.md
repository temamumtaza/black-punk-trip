# Orchestration

## Parent critical path

Establish baseline → integrate four audit reports → implement real persistence/auth/production states → run focused checks → request independent review → resolve regressions → final verification and score matrix.

## Packets

- `01-data-auth-backend` — read-only explorer; Supabase schema, RLS, auth, session, data access, dummy persistence.
- `02-product-flow-ux` — read-only explorer; PRD/design coverage, UI states, accessibility, mobile PWA flow.
- `03-finance-correctness` — read-only explorer; finance algorithms, invariants, tests, settlement edge cases.
- `04-deploy-security-pwa` — read-only explorer; Vercel/Supabase config, PWA, security, errors, HTTP/browser verification.

## Delegation

Four agents in one audit wave, then the same agents receive a separate review prompt after parent integration. Read-only only; no competing writes.

## Agents

Native Codex `explorer` agents, each given the repository path and a bounded packet objective.

## Delegation limits

Maximum four unique agents, two waves, no more than five total active agents. No deployment, credential mutation, or production data changes.

## Wait points

Do not block parent work while agents explore. Wait for all wave-1 reports before integration. Wait for review reports before final verification.

## Fallback

If a native agent fails or is unavailable, parent records the missing packet as blocked and performs a narrow local equivalent; no simulated claim is treated as independent review.

## Execution record

- Wave 1: Kepler, Mendel, Heisenberg, and Meitner performed independent read-only audits.
- Parent action: replaced demo/localStorage runtime, added Supabase repository/RPC boundary, hardened migration, finance validation, UX states, PWA, headers, and release configuration.
- Wave 2: the same four agents independently reviewed the integrated state. Scores remained below the required gate: 7.2, 8.2, 8.2, and 5.0.
- Parent action-review: source-level findings fixed or explicitly rejected against the PRD; external environment findings retained as blockers.
- Final decision: incomplete; no deploy or remote DB mutation was performed.

## Verification order

Source scan → focused tests → lint/typecheck → production build → HTTP/browser/PWA smoke → independent review → final full checks → final audit artifacts.
