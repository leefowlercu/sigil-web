# Commands

Run all commands from the `sigil-web/` root unless otherwise stated.

## Primary Commands

Prefer the native `vp` command surface over equivalent `pnpm` script wrappers
when both exist.

- `vp install`: install or reconcile dependencies through Vite+ using the
  declared package manager.
- `vp dev`: run the TanStack Start and Vite development server on port `3000`
  in live mode (no demo data).
- `vp dev --mode demo`: run the development server on port `3000` in demo mode
  with seeded agent instances, runs, and detail views.
- `vp build`: build the client and server bundles.
- `vp preview`: preview the production build locally.
- `vp test`: run the current Vite+ test suite.
- `pnpm test:acceptance`: run the browser acceptance harness with the pinned
  `agent-browser` runner against a production preview build. No `vp`
  equivalent exists for this custom package script today.
- `vp lint`: run Oxlint without modifying files.
- `vp lint --fix`: apply safe Oxlint fixes.
- `vp lint --fix --fix-suggestions`: apply Tailwind canonical-class rewrites
  and other suggestion fixes in addition to safe fixes.
- `vp fmt . --write`: format the repo with Oxfmt and sort Tailwind classes.
- `vp fmt . --check`: verify formatting without modifying files.
- `vp check`: run non-mutating formatting, lint, and type verification.
- `pnpm <script>` wrappers remain available for compatibility, but use them
  only when a documented `vp` equivalent does not exist.

## Protocol Type Generation

- `cd ../sigil && make build`: build the `sigil` binary in the sibling
  submodule (required before generating types).
- `../sigil/sigil app-server generate-ts --output-file src/lib/protocol/current.generated.ts`:
  regenerate the canonical app-server protocol TypeScript interfaces from the
  Go source of truth. Run this whenever the `sigil` protocol types change.
  After regenerating, verify that existing version adapters in
  `src/lib/protocol/adapters/` still compile against the new types.

## Design and Spec Verification

- `../scripts/verify-specs --subproject sigil-web`: verify PRD, matrix,
  acceptance-title, scenario-manifest, and design-manifest consistency from the
  superproject root.
- `pnpm dlx shadcn@latest add <component>`: add new ShadCN components when the
  design requires them.

## Working Guidance

- Prefer `vp check`, `vp test`, and `vp build` as the default local
  verification trio for implementation work.
- Use `vp lint --fix --fix-suggestions` after broad Tailwind edits; canonical
  class rewrites are suggestion fixes rather than plain safe fixes.
- Do not rely on `vp lint --fix --fix-suggestions` to rewrite every VSCode
  Tailwind canonical-class suggestion; theme-alias cases such as
  `text-(--foreground)` to `text-foreground` may still need manual cleanup.
- Use `pnpm test:acceptance` for deterministic browser verification of live
  WebSocket UI behavior through the scripted fixture harness.
- Run `../scripts/verify-specs --subproject sigil-web` whenever PRD, matrix,
  acceptance-title, scenario-manifest, or design-manifest structure changes.
- Use `vp dev --mode demo` while iterating on UI layout, styling, or Paper
  prototypes where seeded data is needed.
- Use `vp dev` when testing against a real `sigil` app-server instance over
  WebSocket.
