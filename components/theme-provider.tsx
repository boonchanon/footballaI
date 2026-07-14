'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from 'next-themes'

function ThemeDomSync() {
  const { theme, resolvedTheme } = useTheme()

  React.useEffect(() => {
    const activeTheme = theme === 'system' ? resolvedTheme : theme
    const root = document.documentElement

    if (!activeTheme) return

    root.classList.remove('light', 'dark')
    root.classList.add(activeTheme)
    root.style.colorScheme = activeTheme
    root.setAttribute('data-theme', activeTheme)
  }, [resolvedTheme, theme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeDomSync />
      {children}
    </NextThemesProvider>
  )
}
