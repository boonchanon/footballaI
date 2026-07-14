"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { Footer } from "@/components/footer"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"

type SitePageShellProps = {
  badge: string
  title: string
  description: string
  children: ReactNode
}

export function SitePageShell({ badge, title, description, children }: SitePageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,165,32,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(153,27,27,0.18),transparent_28%)]" />
        <div className="container relative mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-foreground">
                หน้าหลัก
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span>{title}</span>
            </div>

            <Badge variant="outline" className="mb-4">
              {badge}
            </Badge>

            <h1 className="font-display text-4xl tracking-tight md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{description}</p>

            <div className="mt-8 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-xl shadow-black/10 backdrop-blur md:p-8">
              <div className="space-y-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-foreground [&_li]:text-muted-foreground [&_p]:leading-7 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

