"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { X, ChevronRight, Sparkles, Trophy, Flame } from "lucide-react"

export function WorldCupBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("wc2026-banner-dismissed")
    if (isDismissed) {
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
    <div className="relative overflow-hidden bg-gradient-to-r from-[#0d1b2a] via-[#1b263b] to-[#0d1b2a]">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(212,165,32,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(220,38,38,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,165,32,0.1),transparent_70%)]" />
      </div>

      {/* Animated shine effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[100%] animate-[shine_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1 left-[5%] text-primary/20 animate-pulse">
          <Trophy className="w-4 h-4" />
        </div>
        <div className="absolute top-2 left-[15%] text-primary/15 animate-pulse delay-300">
          <Sparkles className="w-3 h-3" />
        </div>
        <div className="absolute top-1 right-[12%] text-primary/20 animate-pulse delay-500">
          <Flame className="w-4 h-4" />
        </div>
        <div className="absolute top-2 right-[22%] text-primary/15 animate-pulse delay-700">
          <Trophy className="w-3 h-3" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-2.5 md:py-3 relative z-10">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Icon and Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Trophy Icon with glow */}
            <div className="relative hidden sm:block flex-shrink-0">
              <div className="absolute inset-0 bg-primary/40 rounded-full blur-md animate-pulse" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-primary via-yellow-500 to-primary rounded-full flex items-center justify-center shadow-lg">
                <Trophy className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>

            {/* Text */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse sm:hidden" />
                <span className="font-display text-sm md:text-base tracking-wide text-white whitespace-nowrap">
                  FIFA WORLD CUP
                </span>
                <span className="font-display text-sm md:text-base text-primary">2026</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 text-white/60 text-xs">
                <span>|</span>
                <span>🇺🇸 🇨🇦 🇲🇽</span>
                <span>|</span>
                <span>48 ทีม</span>
                <span>|</span>
                <span>มิ.ย.-ก.ค. 2026</span>
              </div>
              <span className="md:hidden text-xs text-white/60">48 ทีม | 3 ประเทศ</span>
            </div>
          </div>

          {/* Right: Badge and CTA */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Hot badge */}
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
              <Flame className="w-3 h-3 text-red-400 animate-pulse" />
              <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">HOT</span>
            </div>

            {/* CTA Button */}
            <Button
              asChild
              size="sm"
              className="h-7 md:h-8 px-3 md:px-4 rounded-full bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground font-medium shadow-lg shadow-primary/30 group"
            >
              <Link href="/worldcup-2026" className="flex items-center gap-1">
                <span className="text-xs font-semibold">ดูรายละเอียด</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </Button>

            {/* Close */}
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white/80"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Keyframes for shine animation */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </div>
  )
}
