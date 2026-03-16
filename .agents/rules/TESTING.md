# Testing

Testing is split between local implementation checks, spec verification, and
the planned browser acceptance lanes. Choose the narrowest lane that proves the
change, then widen to full verification before concluding.

## Current Implementation Checks

- Use `pnpm check` for formatting and lint verification.
- Use `pnpm test` for the current Vitest suite.
- Use `pnpm build` to verify the TanStack Start production bundles.

## Acceptance and Spec Rules

- Treat `acceptance/features/web_ui.feature` as the external behavior source of
  truth even before the full browser harness is wired.
- Update or add the failing scenario first when behavior changes.
- Run `./scripts/verify-specs --subproject sigil-web` from the superproject
  root whenever routed-state wording or mappings change.
- Keep acceptance titles, matrix titles, and design-manifest titles identical.

## Planned Browser Lanes

- Keep a deterministic fake or scriptable server lane for UI-state and
  error-state coverage.
- Keep a real `sigil app-server serve` lane for contract confidence against the
  actual backend surface.
- Keep those two lanes separate so fast UI iteration does not weaken real
  contract checks.

## Working Guidance

- Re-run `pnpm test` and `pnpm build` after route structure, shared shell, or
  state-boundary changes.
- Re-run the spec verifier after any PRD, matrix, acceptance-title, or design
  manifest change.
- State clearly if a browser acceptance lane is not yet implemented for the
  behavior you changed.
