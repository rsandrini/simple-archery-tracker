'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    // Read directly from localStorage so theme restores even if the FOUC
    // script was skipped (e.g. service worker serving stale cached HTML).
    try {
      const saved = localStorage.getItem('quiver-theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const isDark = saved === 'dark' || (!saved && prefersDark)
      setTheme(isDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', isDark)
    } catch {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    }
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try { localStorage.setItem('quiver-theme', next) } catch { /* ignore */ }
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
