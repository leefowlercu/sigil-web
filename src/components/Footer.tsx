export default function Footer() {
  return (
    <footer className="site-footer mt-16 px-4 pb-14 pt-8 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col gap-4 text-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="island-kicker mb-2">Bootstrap Contract</p>
          <p className="m-0 max-w-2xl leading-6">
            TanStack Start, shadcn/ui, Tailwind CSS, and Lucide are now wired
            into the submodule. The route skeleton mirrors the current PRD and
            design-manifest shape so behavior, design, and implementation stay
            aligned from day one.
          </p>
        </div>
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
          Desktop-first bootstrap
        </p>
      </div>
    </footer>
  )
}
