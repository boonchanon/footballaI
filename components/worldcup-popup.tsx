"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { X, Trophy, Globe, Calendar, ArrowRight } from "lucide-react"

type WorldCupPopupProps = {
  storageKey?: string
  delayMs?: number
}

export function WorldCupPopup({
  storageKey = "footballai-worldcup-popup-home-seen",
  delayMs = 1500,
}: WorldCupPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.sessionStorage.getItem(storageKey) === "true") return

    const timer = setTimeout(() => {
      setIsOpen(true)
      window.sessionStorage.setItem(storageKey, "true")
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    }, delayMs)

    return () => clearTimeout(timer)
  }, [delayMs, storageKey])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => setIsOpen(false), 400)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-400 dark:bg-black/80 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-border/50 shadow-2xl shadow-primary/10 transition-all duration-500 ${isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}`}
      >
        {/* Hero Image Section */}
        <div className="relative h-52 overflow-hidden">
          <Image
            src="/worldcup-2026-popup-bg.jpg"
            alt="FIFA World Cup 2026 Stadium"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/60 backdrop-blur-md border border-border/50 text-foreground/70 hover:text-foreground hover:bg-background/80 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Floating badge */}
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-semibold tracking-wide">
              <Trophy className="w-3 h-3" />
              FIFA WORLD CUP
            </div>
          </div>

          {/* Year overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-2 z-10">
            <h2 className="font-display text-6xl tracking-tight text-foreground leading-none">
              2026
            </h2>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative bg-background px-6 pb-6 pt-3">
          {/* Host countries row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🇺🇸</span>
              <span className="text-lg">🇨🇦</span>
              <span className="text-lg">🇲🇽</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              United 2026
            </span>
          </div>

          {/* Title & description */}
          <h3 className="text-xl font-semibold text-foreground mb-2 text-balance">
            มหกรรมฟุตบอลโลกครั้งยิ่งใหญ่ที่สุด
          </h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            ติดตามทุกแมตช์ ทุกประตู ทุกความตื่นเต้น ครั้งแรกในประวัติศาสตร์กับ 48 ทีมชาติ
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted/50 border border-border/50">
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-display text-xl text-primary">48</span>
              <span className="text-[11px] text-muted-foreground">ทีมชาติ</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted/50 border border-border/50">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-display text-xl text-primary">104</span>
              <span className="text-[11px] text-muted-foreground">แมตช์</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted/50 border border-border/50">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-display text-xl text-primary">16</span>
              <span className="text-[11px] text-muted-foreground">สนาม</span>
            </div>
          </div>

          {/* CTA */}
          <Button
            asChild
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 group"
            onClick={handleClose}
          >
            <Link href="/worldcup-2026" className="flex items-center justify-center gap-2">
              เข้าสู่ฟุตบอลโลก 2026
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>

          {/* Dismiss */}
          <button
            onClick={handleClose}
            className="w-full py-3 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ดูทีหลัง
          </button>
        </div>
      </div>
    </div>
  )
}
