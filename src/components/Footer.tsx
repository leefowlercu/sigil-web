export default function Footer() {
  return (
    <footer className="site-footer px-4 py-3 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col gap-2 text-xs font-semibold sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 max-w-3xl leading-5">
          Root shell owns the viewport-constrained workspace contract and keeps
          route overflow inside explicit panes.
        </p>
        <p className="m-0 uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
          Desktop shell
        </p>
      </div>
    </footer>
  )
}
