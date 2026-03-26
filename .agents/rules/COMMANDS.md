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
- `vp lint`: run Oxlint without modifying files.
- `vp lint --fix`: apply safe Oxlint fixes.
- `vp lint --fix --fix-suggestions`: apply Tailwind canonical-class rewrites
  and other suggestion fixes in addition to safe fixes.
- `vp fmt . --write`: format the repo with Oxfmt and sort Tailwind classes.
- `vp fmt . --check`: verify formatting without modifying files.
- `vp check`: run non-mutating formatting, lint, and type verification.
- `pnpm test:unit`: run fast TypeScript unit tests with Vitest.
- `pnpm test:acceptance`: run browser-first Gherkin acceptance with
  `agent-browser`.
- `pnpm <script>` wrappers remain available for compatibility, but use them
  only when a documented `vp` equivalent does not exist.

## Acceptance Prerequisites

- `agent-browser` must be installed globally or otherwise available on `PATH`.
- Set `AGENT_BROWSER_BIN` when the executable is not named `agent-browser` on
  the current machine.
- Run `agent-browser install` once on a workstation before the first acceptance
  run if browser binaries have not already been installed.

## Protocol Type Generation

- `cd ../sigil && make build`: build the `sigil` binary in the sibling
  submodule (required before generating types).
- `../sigil/sigil app-server generate-ts --output-file src/lib/protocol/current.generated.ts`:
  regenerate the canonical app-server protocol TypeScript interfaces from the
  Go source of truth. Run this whenever the `sigil` protocol types change.
  After regenerating, verify that existing version adapters in
  `src/lib/protocol/adapters/` still compile against the new types.

## Component Generation

- `pnpm dlx shadcn@latest add <component>`: add new ShadCN components when the
  design requires them.

## Working Guidance

- Prefer `vp check` and `vp build` as the default local maintenance pair for
  implementation work.
- Use `pnpm test:unit` for reducer, protocol, and session-client loops.
- Use `pnpm test:acceptance` for browser-visible behavior changes.
- Use `vp lint --fix --fix-suggestions` after broad Tailwind edits; canonical
  class rewrites are suggestion fixes rather than plain safe fixes.
- Do not rely on `vp lint --fix --fix-suggestions` to rewrite every VSCode
  Tailwind canonical-class suggestion; theme-alias cases such as
  `text-(--foreground)` to `text-foreground` may still need manual cleanup.
- Use `vp dev --mode demo` while iterating on UI layout or styling where
  seeded data is needed.
- Use `vp dev` when testing against a real `sigil` app-server instance over
  WebSocket.
- Use `../scripts/verify-specs --subproject sigil-web` whenever PRD, matrix, or
  acceptance-title structure changes.
