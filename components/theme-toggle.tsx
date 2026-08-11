"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = mounted ? (theme === "system" ? resolvedTheme : theme) : "dark"
  const isDark = activeTheme === "dark"
  const label = theme === "system" ? "System" : isDark ? "Dark" : "Light"
  const Icon = theme === "system" ? Monitor : isDark ? Moon : Sun
  const options = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center rounded-full border border-border/80 bg-card/80 text-foreground shadow-sm backdrop-blur-sm transition hover:border-primary/35 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            compact ? "gap-2 px-2.5 py-1.5" : "gap-3 px-3 py-2",
          )}
          aria-label="เลือกธีมสี"
          suppressHydrationWarning
        >
          <div className={cn("text-right", compact ? "hidden" : "hidden sm:block")}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Color Scheme</p>
            <p className="text-xs font-medium" suppressHydrationWarning>{label}</p>
          </div>

          <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
            <Icon className={cn("transition-colors", compact ? "h-3.5 w-3.5" : "h-4 w-4", mounted ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("hidden text-xs font-semibold", compact ? "" : "sm:inline")} suppressHydrationWarning>
              {label}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {options.map((option) => {
          const OptionIcon = option.icon
          const selected = mounted && theme === option.value
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn("cursor-pointer", selected && "bg-accent text-accent-foreground")}
            >
              <OptionIcon className={cn("mr-2 h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
              {option.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
