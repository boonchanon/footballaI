"use client"

import { X, Shield, Award, User, Trophy, Star, ChevronRight, MapPin, Hash } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"

type TeamDetail = {
  history: string
  achievements: string[]
  starPlayers: { name: string; position: string; club: string }[]
  formation: string
  manager: string
  fifaRanking: number
  wcAppearances: number
  bestResult: string
}

interface TeamDetailModalProps {
  team: { name: string; flag: string; confederation: string; status: string } | null
  detail: TeamDetail | null
  onClose: () => void
}

export function TeamDetailModal({ team, detail, onClose }: TeamDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (team) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [team])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  if (!team || !detail) return null

  const confColors: Record<string, string> = {
    UEFA: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    CONMEBOL: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    CONCACAF: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    AFC: "bg-red-500/10 text-red-400 border-red-500/20",
    CAF: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/75 p-4 pt-20 pb-10 backdrop-blur-sm dark:bg-black/70"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="relative w-full max-w-2xl bg-background rounded-2xl border border-border/50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
          <div className="relative p-6 pb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 z-10"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </Button>

            <div className="flex items-center gap-4">
              <span className="text-6xl">{team.flag}</span>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-display text-foreground">{team.name}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={`text-xs border ${confColors[team.confederation] || "bg-muted text-muted-foreground"}`}>
                    {team.confederation}
                  </Badge>
                  {team.status === "เจ้าภาพ" && (
                    <Badge className="text-xs bg-primary/20 text-primary border-primary/30 border">
                      <MapPin className="w-3 h-3 mr-1" />
                      {"เจ้าภาพ"}
                    </Badge>
                  )}
                  {team.status === "แชมป์โลก" && (
                    <Badge className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30 border">
                      <Trophy className="w-3 h-3 mr-1" />
                      {"แชมป์โลก"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-center border border-border/50">
                <Hash className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-display text-primary">{detail.fifaRanking}</p>
                <p className="text-xs text-muted-foreground">{"FIFA Ranking"}</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-center border border-border/50">
                <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-display text-primary">{detail.wcAppearances}</p>
                <p className="text-xs text-muted-foreground">{"เข้าร่วม WC"}</p>
              </div>
              <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-center border border-border/50">
                <Star className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs font-semibold text-primary leading-tight">{detail.bestResult}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{"ผลงานดีที่สุด"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* History */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">{"ประวัติในฟุตบอลโลก"}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{detail.history}</p>
          </div>

          {/* Achievements */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">{"ความสำเร็จ"}</h3>
            </div>
            <div className="space-y-2">
              {detail.achievements.map((achievement, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{achievement}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Star Players */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">{"นักเตะดาวเด่น"}</h3>
            </div>
            <div className="grid gap-3">
              {detail.starPlayers.map((player, i) => (
                <Card key={i} className="border-border/50 bg-muted/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-display text-primary">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{player.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{player.position}</span>
                        <span className="text-border">{"/"}</span>
                        <span>{player.club}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Formation & Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{"แผนการเล่น"}</span>
              </div>
              <p className="text-xl font-display text-foreground">{detail.formation}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{"ผู้จัดการทีม"}</span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">{detail.manager}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
