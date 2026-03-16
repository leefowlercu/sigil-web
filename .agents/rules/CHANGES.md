# Changes

Work inside `sigil-web/` as an implementation submodule of the `project-sigil`
superproject. Keep local code changes aligned with the superproject specs and
avoid unrelated repo-state churn.

## Boundary Rules

- Treat `sigil-web/` as the implementation layer for `docs/sigil-web/`.
- Keep spec updates in the superproject docs when behavior changes require
  them.
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
- Keep exploratory design variants either in Paper or in short-lived local code
  branches until a direction is selected.
- Prefer targeted route and component changes over broad visual rewrites when
  the routed behavior contract is already narrow.
- State any intentional spec, design, or implementation gaps explicitly in the
  final handoff.
