import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

type ThemeMode = 'light' | 'dark'

function readThemeMode(): ThemeMode {
  if (typeof document === 'undefined') {
    return 'dark'
  }

  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function AppToaster() {
  const [theme, setTheme] = useState<ThemeMode>('dark')

  useEffect(() => {
    const updateTheme = () => {
      setTheme(readThemeMode())
    }

    updateTheme()

    const observer = new MutationObserver(() => {
      updateTheme()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return <Toaster theme={theme} richColors />
}
