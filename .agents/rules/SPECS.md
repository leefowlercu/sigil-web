# Specs

The behavioral source of truth for `sigil-web/` lives in the superproject docs
plus the mapped Gherkin acceptance files in this submodule.

## Primary Spec Sources

- ADR index: `../../docs/sigil-web/ADR/README.md`
- PRD index: `../../docs/sigil-web/PRD/README.md`
- Traceability matrix: `../../docs/sigil-web/PRD/MATRIX.md`
- Acceptance features: `../acceptance/features/*.feature`

## Update Rules

- Update PRD acceptance criteria before or alongside implementation changes.
- Keep PRD scenario IDs in `SCN-xxxx` form and preserve exact title alignment
  with the mapped acceptance scenario when behavior is unchanged.
- Update `docs/sigil-web/PRD/MATRIX.md` and the mapped `acceptance/features`
  file in the same change when a mapped behavior changes.
- Update ADRs when architectural direction or a long-lived technical tradeoff
  changes.
- Mark visible but intentionally unimplemented affordances as deferred in the
  owning PRD instead of silently growing implementation behavior.

## Verification Rule

- Run `./scripts/verify-specs --subproject sigil-web` from the superproject root
  after structural PRD, matrix, or acceptance-title changes.
