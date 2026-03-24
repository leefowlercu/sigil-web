# sigil-web

Siĝil Web is the Web UI command, control, and orchestration plane for the
Siĝil app-server when it runs in WebSocket mode.

## Stack Direction

- TanStack Start
- React
- ShadCN components and blocks
- Lucide icons
- Tailwind CSS
- Paper.Design as the normative routed-state design source

## Bootstrap Artifacts

- Behavior specs live in
  [`../docs/sigil-web/PRD`](../docs/sigil-web/PRD) and map to
  [`acceptance/features/web_ui.feature`](acceptance/features/web_ui.feature).
- Routed scenario verification lives in
  [`verification/scenarios/manifest.toml`](verification/scenarios/manifest.toml).
- Visual Paper metadata lives in
  [`verification/design/manifest.toml`](verification/design/manifest.toml).
- The current architecture decisions live in
  [`../docs/sigil-web/ADR`](../docs/sigil-web/ADR).

## Development Commands

- `pnpm dev`: run the TanStack Start app locally on port `3000` through Vite+
- `pnpm build`: build the client and server bundles through Vite+
- `pnpm test`: run the current Vite+ test suite
- `pnpm lint`: run Vite+ linting without modifying files
- `pnpm lint:fix`: apply Vite+ lint fixes
- `pnpm format`: format the repository with Vite+ formatting
- `pnpm format:check`: verify Vite+ formatting
- `pnpm check`: run Vite+ formatting, lint, and type verification

## Route Contract

- root application shell: viewport-constrained desktop-first workspace layout
  with a compact-height fallback below the minimum supported desktop height
- `/`: redirect to `/agents`
- `/agents`: selected-agent deep-link route family
- `/runs/$runId`: reserved run-detail route family pending re-specified behavior

The current implementation scaffold may lag the latest governance docs while
route refactors are in progress. Treat the PRDs, acceptance feature, scenario
manifest, and design manifest as the normative route contract.

## Workflow

- Add or update PRD acceptance scenarios first.
- Keep `docs/sigil-web/PRD/MATRIX.md`,
  `acceptance/features/web_ui.feature`, and
  `verification/scenarios/manifest.toml` mechanically aligned.
- Keep `verification/design/manifest.toml` aligned for scenarios that carry Paper
  evidence.
- Use Paper artboards as the visual source of truth only for routed UI states
  that declare Paper evidence.
- Preserve stable `data-testid` values during visual iteration so acceptance
  coverage remains durable.
