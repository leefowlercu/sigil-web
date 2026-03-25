import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

function SigilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={className}>
      <path
        d="M 70 140 Q 100 170 130 140 T 130 70 Q 100 40 70 70 T 70 140"
        fill="none"
        stroke="var(--sigil-accent)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M 75 35 L 100 15 L 125 35"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="105" r="12" fill="currentColor" />
    </svg>
  )
}

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) backdrop-blur-lg">
      <nav className="flex items-center gap-3 py-2.5 pr-3 pl-2.5">
        <Link to="/" className="flex items-center gap-2 text-foreground no-underline hover:text-foreground">
          <SigilIcon className="size-10 pt-0.5" />
          <span className="text-2xl font-bold tracking-tight">Siĝil</span>
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
