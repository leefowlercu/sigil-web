# sigil-web

Siĝil Web is the Web UI command, control, and orchestration plane for the
Siĝil app-server when it runs in WebSocket mode.

## Stack Direction

- TanStack Start
- React
- ShadCN components and blocks
- Lucide icons
- Tailwind CSS

## Current State

- There is currently no active committed ADR, PRD, acceptance, or verification
  suite for `sigil-web`.
- [`../docs/sigil-web/README.md`](../docs/sigil-web/README.md) is the
  superproject placeholder for a future rebuild.

## Development Commands

- `pnpm dev`: run the TanStack Start app locally on port `3000` through Vite+
- `pnpm build`: build the client and server bundles through Vite+
- `pnpm lint`: run Vite+ linting without modifying files
- `pnpm lint:fix`: apply Vite+ lint fixes
- `pnpm format`: format the repository with Vite+ formatting
- `pnpm format:check`: verify Vite+ formatting
- `pnpm check`: run Vite+ formatting, lint, and type verification

## Route Surface

- root application shell: viewport-constrained desktop-first workspace layout
  with a compact-height fallback below the minimum supported desktop height
- `/`: primary agent workspace with selected-agent deep-linking via `?agent=`
- `/runs/$runId`: reserved run-detail route family pending re-specified
  behavior

## Workflow

- Treat the current repository as an implementation baseline.
- Keep route semantics and stable `data-testid` values intact unless the task
  explicitly changes them.
