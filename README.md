# sigil-web

Siĝil Web is the Web UI command, control, and orchestration plane for the
Siĝil app-server when it runs in WebSocket mode.

## Stack Direction

- TanStack Start
- React
- ShadCN components and blocks
- Lucide icons
- Tailwind CSS
- Paper.Design as the normative routed-state design source

## Bootstrap Artifacts

- Behavior specs live in
  [`../docs/sigil-web/PRD`](../docs/sigil-web/PRD) and map to
  [`acceptance/features/web_ui.feature`](acceptance/features/web_ui.feature).
- Routed UI design state lives in
  [`design/design-manifest.toml`](design/design-manifest.toml).
- The current architecture decisions live in
  [`../docs/sigil-web/ADR`](../docs/sigil-web/ADR).

## Workflow

- Add or update PRD acceptance scenarios first.
- Keep `docs/sigil-web/PRD/MATRIX.md`,
  `acceptance/features/web_ui.feature`, and
  `design/design-manifest.toml` mechanically aligned.
- Use Paper artboards as the visual source of truth for routed UI states.
- Preserve stable `data-testid` values during visual iteration so acceptance
  coverage remains durable.
