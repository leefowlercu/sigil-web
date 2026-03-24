# Testing

Testing is split between local implementation checks, spec verification, and
the browser acceptance harness. Choose the narrowest lane that proves the change,
then widen to full verification before concluding.

## Current Implementation Checks

- Use `vp check` for formatting, canonical Tailwind linting, and type
  verification.
- Use `vp test` for the current Vitest suite.
- Use `vp build` to verify the TanStack Start production bundles.

## Acceptance and Spec Rules

- Treat `acceptance/features/web_ui.feature` as the external behavior source of
  truth even before the full browser harness is wired.
- Update or add the failing scenario first when behavior changes.
- Run `./scripts/verify-specs --subproject sigil-web` from the superproject
  root whenever routed-state wording or mappings change.
- Keep acceptance titles, matrix titles, and scenario-manifest titles
  identical. When a scenario carries Paper evidence, keep the matching
  design-manifest title identical too.
- Do not use `@visual` or `@nonvisual` in the feature file; verification lanes
  are owned by the manifests.

## Browser Harness

- `agent-browser` is the browser acceptance runner for `sigil-web`.
- Keep a deterministic scripted `agent-browser` fixture lane for UI-state and
  error-state coverage.
- Record browser evidence in
  `sigil-web/verification/scenarios/manifest.toml` with
  `lane = "agent-browser"` plus the matching `file` and `match`.

## Working Guidance

- Re-run `vp test` and `vp build` after route structure, shared shell, or
  state-boundary changes.
- Re-run `vp lint --fix --fix-suggestions` after broad Tailwind refactors when
  you need canonical-class rewrites applied automatically.
- Use `pnpm test:acceptance` for deterministic scripted-server browser
  coverage.
- Re-run the spec verifier after any PRD, matrix, acceptance-title,
  scenario-manifest, or design-manifest change.
- State clearly if a browser acceptance lane is not yet implemented for the
  behavior you changed.
