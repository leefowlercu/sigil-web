# sigil-web

Siĝil Web is the Web UI command, control, and orchestration plane for the Siĝil app-server when it runs in WebSocket mode.

## Development Commands

- `pnpm dev`: run the TanStack Start app locally on port `3000` through Vite+
- `pnpm dev:demo`: run the app with seeded demo agents and runs
- `pnpm build`: build the client and server bundles through Vite+
- `pnpm lint`: run Vite+ linting without modifying files
- `pnpm lint:fix`: apply Vite+ lint fixes
- `pnpm format`: format the repository with Vite+ formatting
- `pnpm format:check`: verify Vite+ formatting
- `pnpm check`: run Vite+ formatting, lint, and type verification
- `pnpm test:unit`: run fast implementation-focused TypeScript tests
- `pnpm test:acceptance`: run browser-first Gherkin acceptance through
  `agent-browser`
- `pnpm test:acceptance -- "Scenario name"`: run one acceptance scenario by
  title
- `pnpm test:acceptance:headed -- "Scenario name"`: run one acceptance
  scenario by title in a visible browser window for visual review
- `pnpm test:acceptance:review -- "Scenario name"`: run one acceptance
  scenario by title in a visible browser window with small review pauses
- `VITE_ENABLE_TANSTACK_DEVTOOLS=true pnpm dev`: opt into the TanStack
  Devtools launcher during local development

## Route Surface

- root application shell: viewport-constrained desktop-first workspace layout
  with a compact-height fallback below the minimum supported desktop height
- `/`: primary agent workspace with selected-agent deep-linking via `?agent=`
- `/runs/$runId`: reserved run-detail route family pending re-specified
  behavior
