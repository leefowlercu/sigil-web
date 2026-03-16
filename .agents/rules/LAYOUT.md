# Layout

This submodule follows a small TanStack Start application layout with routed
workflows under `src/routes/`, shared UI primitives under `src/components/`,
and routed-state governance in checked-in design and acceptance artifacts.

## Top-Level Directories

- `src/routes/`: TanStack Start file-routed workflows and application shell.
- `src/components/`: shared app chrome and non-route-specific React components.
- `src/components/ui/`: ShadCN-derived UI primitives.
- `src/lib/`: client-side helpers, seeded data, and future app-server client
  seams.
- `public/`: static assets served by Vite and TanStack Start.
- `design/`: the checked-in Paper design manifest and routed-state contract.
- `acceptance/features/`: Gherkin feature source of truth for web behavior.
- `.tanstack/`: generated framework state and temp files that should remain out
  of commits.
- `dist/`: generated production build output that should remain out of commits.

## Working Guidance

- Start from `src/routes/` when changing user-visible workflow behavior.
- Start from `src/components/` when changing shared shell, navigation, or
  reusable visual composition.
- Start from `src/lib/` when introducing shared client state, query helpers, or
  generated app-server type boundaries.
- Start from `design/design-manifest.toml` when the routed-state contract,
  Paper artboard mapping, or required `data-testid` values change.
- Start from `acceptance/features/web_ui.feature` when behavior is
  acceptance-driven or route-state wording changes.
