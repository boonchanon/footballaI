"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
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
      className={cn(
        "flex items-center rounded-full border border-border/80 bg-card/80 text-foreground shadow-sm backdrop-blur-sm",
        compact ? "gap-2 px-2.5 py-1.5" : "gap-3 px-3 py-2",
      )}
      aria-label="Color scheme toggle"
      suppressHydrationWarning
    >
      <div className={cn("text-right", compact ? "hidden" : "hidden sm:block")}>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Color Scheme</p>
        <p className="text-xs font-medium" suppressHydrationWarning>{isDark ? "Dark Theme" : "Light Theme"}</p>
      </div>

      <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
        <Moon className={cn("transition-colors", compact ? "h-3.5 w-3.5" : "h-4 w-4", isDark ? "text-primary" : "text-muted-foreground")} />
        <span
          className={`relative inline-flex shrink-0 rounded-full border border-transparent transition-all ${
            compact ? "h-4 w-7" : "h-[1.15rem] w-8"
          } ${
            isDark ? "bg-primary" : "bg-input"
          }`}
        >
          <span
            className={`absolute top-[1px] block rounded-full bg-background transition-transform ${
              compact ? "h-3 w-3" : "h-4 w-4"
            } ${
              mounted && isDark ? (compact ? "translate-x-[11px]" : "translate-x-[14px]") : "translate-x-0"
            }`}
          />
        </span>
        <Sun className={cn("transition-colors", compact ? "h-3.5 w-3.5" : "h-4 w-4", isDark ? "text-muted-foreground" : "text-primary")} />
      </div>
    </button>
  )
}
