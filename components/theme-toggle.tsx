"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = mounted ? (theme === "system" ? resolvedTheme : theme) : "dark"
  const isDark = activeTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => {
        if (!mounted) return
        setTheme(isDark ? "light" : "dark")
      }}
      className="flex items-center gap-3 rounded-full border border-border/80 bg-card/80 px-3 py-2 text-foreground shadow-sm backdrop-blur-sm"
      aria-label="Color scheme toggle"
      suppressHydrationWarning
    >
      <div className="hidden text-right sm:block">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Color Scheme</p>
        <p className="text-xs font-medium" suppressHydrationWarning>{isDark ? "Dark Theme" : "Light Theme"}</p>
      </div>

      <div className="flex items-center gap-2">
        <Moon className={`h-4 w-4 transition-colors ${isDark ? "text-primary" : "text-muted-foreground"}`} />
        <span
          className={`relative inline-flex h-[1.15rem] w-8 shrink-0 rounded-full border border-transparent transition-all ${
            isDark ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`absolute top-[1px] block h-4 w-4 rounded-full bg-background transition-transform ${
              mounted && isDark ? "translate-x-[14px]" : "translate-x-0"
            }`}
          />
        </span>
        <Sun className={`h-4 w-4 transition-colors ${isDark ? "text-muted-foreground" : "text-primary"}`} />
      </div>
    </button>
  )
}
