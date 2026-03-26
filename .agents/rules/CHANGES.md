# Changes

Work inside `sigil-web/` as an implementation submodule of the `project-sigil`
superproject. Keep local code changes focused and avoid unrelated repo-state
churn.

## Boundary Rules

- Treat `sigil-web/` as the implementation layer for the current product.
- Keep `sigil-web/` implementation changes aligned with the active
  `docs/sigil-web/` ADR, PRD, matrix, and acceptance suite.
- Do not modify `sigil/` or unrelated superproject docs unless the task
  requires coordinated cross-repo work.

## Authorization Rules

- Do not run `git commit` unless the user explicitly asks for a commit in the
  current conversation.
- Do not run `git push` unless the user explicitly asks for a push in the
  current conversation.
- Do not update the `sigil-web/` submodule pointer from the superproject unless
  the task explicitly requires it.

## Hygiene Rules

- Keep generated build output and transient workspace artifacts out of commits,
  including `dist/`, `.tanstack/`, and `node_modules/`.
- Keep acceptance temp files and browser artifacts out of commits.
- Keep exploratory design variants in short-lived local code branches until a
  direction is selected.
- Prefer targeted route and component changes over broad rewrites unless the
  task is explicitly a reset or redesign.
- State any intentional documentation or implementation gaps explicitly in the
  final handoff.
