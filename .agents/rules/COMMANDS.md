# Commands

Run all commands from the `sigil-web/` root unless otherwise stated.

## Primary PNPM Commands

- `pnpm install`: install or reconcile dependencies from `package.json` and
  `pnpm-lock.yaml`.
- `pnpm dev`: run the TanStack Start and Vite development server on port
  `3000` in live mode (no demo data).
- `pnpm dev:demo`: run the development server on port `3000` in demo mode
  with seeded agent instances, runs, and detail views.
- `pnpm build`: build the client and server bundles.
- `pnpm preview`: preview the production build locally.
- `pnpm test`: run the current Vitest suite.
- `pnpm test:acceptance`: run the browser acceptance harness with the pinned
  `agent-browser` runner against a production preview build.
- `pnpm lint`: run ESLint without modifying files.
- `pnpm lint:fix`: apply ESLint fixes.
- `pnpm format`: format the repo with Prettier.
- `pnpm format:check`: verify Prettier formatting without modifying files.
- `pnpm check`: run non-mutating formatting plus lint verification.

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

- Prefer `pnpm check`, `pnpm test`, and `pnpm build` as the default local
  verification trio for implementation work.
- Use `pnpm test:acceptance` for deterministic browser verification of live
  WebSocket UI behavior through the scripted fixture harness.
- Run `../scripts/verify-specs --subproject sigil-web` whenever PRD, matrix,
  acceptance-title, scenario-manifest, or design-manifest structure changes.
- Use `pnpm dev:demo` while iterating on UI layout, styling, or Paper
  prototypes where seeded data is needed.
- Use `pnpm dev` when testing against a real `sigil` app-server instance over
  WebSocket.
