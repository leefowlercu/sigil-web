# Specs

The behavioral and routed-state source of truth for `sigil-web` lives in the
superproject docs plus the checked-in design manifest, not inside ad hoc UI
screens or one-off screenshots.

## Primary Spec Sources

- ADR index: `../../docs/sigil-web/ADR/README.md`
- PRD index: `../../docs/sigil-web/PRD/README.md`
- Traceability matrix: `../../docs/sigil-web/PRD/MATRIX.md`
- Submodule acceptance file: `../acceptance/features/web_ui.feature`
- Design manifest: `../design/design-manifest.toml`

## Update Rules

- Update PRD acceptance criteria before or alongside implementation changes.
- Keep PRD scenario IDs in `SCN-xxxx` form and preserve exact title alignment
  with the mapped acceptance scenario when behavior is unchanged.
- Update `docs/sigil-web/PRD/MATRIX.md`,
  `sigil-web/acceptance/features/web_ui.feature`, and
  `sigil-web/design/design-manifest.toml` in the same change when a mapped
  routed behavior changes.
- Update ADRs when route architecture, design-governance rules, or long-lived
  implementation tradeoffs change.
- Keep route IDs, state IDs, and required `data-testid` values aligned with the
  design manifest.

## Verification Rule

- Run `./scripts/verify-specs --subproject sigil-web` from the superproject
  root after structural PRD, matrix, acceptance-title, or design-manifest
  changes.
