# Commands

Run all commands from the `sigil-web/` root unless otherwise stated.

## Primary PNPM Commands

- `pnpm install`: install or reconcile dependencies from `package.json` and
  `pnpm-lock.yaml`.
- `pnpm dev`: run the TanStack Start and Vite development server on port
  `3000`.
- `pnpm build`: build the client and server bundles.
- `pnpm preview`: preview the production build locally.
- `pnpm test`: run the current Vitest suite.
- `pnpm lint`: run ESLint without modifying files.
- `pnpm lint:fix`: apply ESLint fixes.
- `pnpm format`: format the repo with Prettier.
- `pnpm format:check`: verify Prettier formatting without modifying files.
- `pnpm check`: run non-mutating formatting plus lint verification.

## Design and Spec Verification

- `../scripts/verify-specs --subproject sigil-web`: verify PRD, matrix,
  acceptance-title, and design-manifest consistency from the superproject root.
- `pnpm dlx shadcn@latest add <component>`: add new ShadCN components when the
  design requires them.

## Working Guidance

- Prefer `pnpm check`, `pnpm test`, and `pnpm build` as the default local
  verification trio for implementation work.
- Run `../scripts/verify-specs --subproject sigil-web` whenever PRD, matrix,
  acceptance-title, or design-manifest structure changes.
- Use `pnpm dev` while iterating with Paper or reviewing routed UI states in
  the browser.
