import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '#/components/ui/button'

type ThemeMode = 'light' | 'dark'

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(mode)
  document.documentElement.setAttribute('data-theme', mode)
  document.documentElement.style.colorScheme = mode
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    const initialMode = getInitialMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  function toggleMode() {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light'
    setMode(nextMode)
    applyThemeMode(nextMode)
    window.localStorage.setItem('theme', nextMode)
  }

  const label = `Switch to ${mode === 'light' ? 'dark' : 'light'} mode`
  const Icon = mode === 'dark' ? Moon : Sun

  return (
    <Button
      type="button"
      variant="toolbar"
      size="icon-sm"
      className="text-foreground hover:bg-(--sigil-accent) hover:text-foreground"
      onClick={toggleMode}
      aria-label={label}
      title={label}
    >
      <Icon className="size-4" />
    </Button>
  )
}
