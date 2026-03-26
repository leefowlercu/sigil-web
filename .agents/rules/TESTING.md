# Testing

Testing is split into fast implementation checks and browser-first acceptance
coverage. Choose the narrowest lane that proves the change, then widen to full
verification before concluding.

## Unit Tests

- Keep fast TypeScript tests focused on reducers, protocol helpers, and
  session-client logic.
- Use `pnpm test:unit` for the fast implementation lane.

## Acceptance Tests

- Treat `acceptance/features/*.feature` as the external behavior source of
  truth.
- Update or add the failing scenario first when behavior changes.
- Run browser acceptance through `agent-browser`; do not introduce a second
  browser driver for this repo.
- Use `pnpm test:acceptance` for browser-visible verification.

## Full Verification

- Use `vp check`, `pnpm test:unit`, `pnpm test:acceptance`, and `vp build`
  before concluding implementation work.
- Re-run acceptance when route behavior, session lifecycle, selectors, or
  acceptance harness helpers change.
