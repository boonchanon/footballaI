"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, Flame, Sparkles, Trophy, X } from "lucide-react"

import { Button } from "@/components/ui/button"

export function WorldCupBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("wc2026-banner-dismissed")
    if (stored) {
      setDismissed(true)
      setIsVisible(false)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setDismissed(true)
    sessionStorage.setItem("wc2026-banner-dismissed", "true")
  }

  if (!isVisible || dismissed) return null

  return (
    <div className="relative overflow-hidden border-b border-border/70 bg-gradient-to-r from-background via-card to-background">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(184,255,0,0.14),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(184,255,0,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(184,255,0,0.07),transparent_70%)]" />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[100%] animate-[shine_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[5%] top-1 animate-pulse text-primary/20">
          <Trophy className="h-4 w-4" />
        </div>
        <div className="absolute left-[15%] top-2 animate-pulse text-primary/15 delay-300">
          <Sparkles className="h-3 w-3" />
        </div>
        <div className="absolute right-[12%] top-1 animate-pulse text-primary/20 delay-500">
          <Flame className="h-4 w-4" />
        </div>
        <div className="absolute right-[22%] top-2 animate-pulse text-primary/15 delay-700">
          <Trophy className="h-3 w-3" />
        </div>
      </div>

      <div className="container relative z-10 mx-auto px-4 py-2.5 md:py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative hidden shrink-0 sm:block">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/30 blur-md" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary shadow-lg">
                <Trophy className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary sm:hidden" />
                <span className="font-display whitespace-nowrap text-sm tracking-wide text-foreground md:text-base">
                  FIFA WORLD CUP
                </span>
                <span className="font-display text-sm text-primary md:text-base">2026</span>
              </div>
              <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
                <span>|</span>
                <span>USA • CAN • MEX</span>
                <span>|</span>
                <span>48 ทีม</span>
                <span>|</span>
                <span>มิ.ย. - ก.ค. 2026</span>
              </div>
              <span className="text-xs text-muted-foreground md:hidden">48 ทีม | 3 ประเทศเจ้าภาพ</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 lg:flex">
              <Flame className="h-3 w-3 animate-pulse text-primary" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-primary">Hot</span>
            </div>

            <Button
              asChild
              size="sm"
              className="group h-7 rounded-full bg-gradient-to-r from-primary to-primary/80 px-3 font-medium text-primary-foreground shadow-lg shadow-primary/20 md:h-8 md:px-4"
            >
              <Link href="/worldcup-2026" className="flex items-center gap-1">
                <span className="text-xs font-semibold">ดูรายละเอียด</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>

            <button
              onClick={handleDismiss}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              aria-label="ปิดแบนเนอร์"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <style jsx>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
      `}</style>
    </div>
  )
}
