"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

interface Shot {
  id: number
  x: number
  y: number
  result: "goal" | "saved" | "blocked" | "missed"
  type: "right_foot" | "left_foot" | "header"
  situation: "regular_play" | "free_kick" | "fast_break" | "set_piece" | "corner" | "penalty"
  xG: number
  xGOT: number
  matchId?: number
  homeTeam?: string
  awayTeam?: string
  homeScore?: number
  awayScore?: number
  homeLogo?: string
  awayLogo?: string
}

interface ShotMapProps {
  shots: Shot[]
  totalShots: number
  totalGoals: number
  totalXG: number
  onTargetPercentage: number
}

export function PlayerShotMap({ shots, totalShots, totalGoals, totalXG, onTargetPercentage }: ShotMapProps) {
  const [selectedShot, setSelectedShot] = useState<Shot | null>(shots.find((s) => s.result === "goal") || shots[0])
  const [activeFilter, setActiveFilter] = useState<string>("all")

  const filters = [
    { key: "goals", label: "Goals", count: shots.filter((s) => s.result === "goal").length, isHighlight: true },
    { key: "regular_play", label: "Regular play", count: shots.filter((s) => s.situation === "regular_play").length },
    { key: "free_kick", label: "Free kick", count: shots.filter((s) => s.situation === "free_kick").length },
    { key: "fast_break", label: "Fast break", count: shots.filter((s) => s.situation === "fast_break").length },
    { key: "set_piece", label: "Set piece", count: shots.filter((s) => s.situation === "set_piece").length },
    { key: "corner", label: "From corner", count: shots.filter((s) => s.situation === "corner").length },
    { key: "right_foot", label: "Right foot", count: shots.filter((s) => s.type === "right_foot").length },
    { key: "left_foot", label: "Left foot", count: shots.filter((s) => s.type === "left_foot").length },
    { key: "header", label: "Header", count: shots.filter((s) => s.type === "header").length },
  ]

  const filteredShots =
    activeFilter === "all"
      ? shots
      : activeFilter === "goals"
        ? shots.filter((s) => s.result === "goal")
        : shots.filter((s) => s.situation === activeFilter || s.type === activeFilter)

  const navigateShot = (direction: "prev" | "next") => {
    if (!selectedShot) return
    const currentIndex = filteredShots.findIndex((s) => s.id === selectedShot.id)
    if (direction === "prev" && currentIndex > 0) {
      setSelectedShot(filteredShots[currentIndex - 1])
    } else if (direction === "next" && currentIndex < filteredShots.length - 1) {
      setSelectedShot(filteredShots[currentIndex + 1])
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "right_foot":
        return "Right foot"
      case "left_foot":
        return "Left foot"
      case "header":
        return "Header"
      default:
        return type
    }
  }

  const getSituationLabel = (situation: string) => {
    switch (situation) {
      case "regular_play":
        return "Regular play"
      case "free_kick":
        return "Free kick"
      case "fast_break":
        return "Fast break"
      case "set_piece":
        return "Set piece"
      case "corner":
        return "From corner"
      case "penalty":
        return "Penalty"
      default:
        return situation
    }
  }

  const getResultLabel = (result: string) => {
    switch (result) {
      case "goal":
        return "Goal"
      case "saved":
        return "Saved"
      case "blocked":
        return "Blocked"
      case "missed":
        return "Missed"
      default:
        return result
    }
  }

  const pitchWidth = 400
  const pitchHeight = 320

  const getShotPosition = (shot: Shot) => {
    const x = 60 + (shot.x / 100) * (pitchWidth - 120)
    const y = 30 + ((100 - shot.y) / 100) * (pitchHeight - 80)
    return { x, y }
  }

  return (
    <Card className="border-border/50 bg-card overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Season shot map</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">On target: {onTargetPercentage}%</p>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 rounded-full p-1">
            <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-foreground/60" />
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ backgroundColor: "#1a1f2e" }}>
              <svg viewBox={`0 0 ${pitchWidth} ${pitchHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                {/* Pitch background with gradient */}
                <defs>
                  <linearGradient id="pitchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1e2433" />
                    <stop offset="100%" stopColor="#151a26" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width={pitchWidth} height={pitchHeight} fill="url(#pitchGradient)" />

                {/* Outer boundary with rounded corners */}
                <rect
                  x="40"
                  y="20"
                  width={pitchWidth - 80}
                  height={pitchHeight - 40}
                  fill="none"
                  stroke="#3d4556"
                  strokeWidth="2"
                  rx="8"
                />

                {/* Penalty area */}
                <rect
                  x="90"
                  y="150"
                  width={pitchWidth - 180}
                  height="130"
                  fill="none"
                  stroke="#3d4556"
                  strokeWidth="2"
                  rx="4"
                />

                {/* Goal area (6-yard box) */}
                <rect
                  x="140"
                  y="220"
                  width={pitchWidth - 280}
                  height="60"
                  fill="none"
                  stroke="#3d4556"
                  strokeWidth="2"
                  rx="2"
                />

                {/* Penalty arc */}
                <path
                  d={`M 110 150 Q ${pitchWidth / 2} 90 ${pitchWidth - 110} 150`}
                  fill="none"
                  stroke="#3d4556"
                  strokeWidth="2"
                />

                {/* Penalty spot */}
                <circle cx={pitchWidth / 2} cy="195" r="4" fill="#4a5568" />

                {/* Goal frame */}
                <g>
                  {/* Goal net background */}
                  <rect
                    x="155"
                    y="278"
                    width={pitchWidth - 310}
                    height="22"
                    fill="#252b3a"
                    stroke="#4a5568"
                    strokeWidth="2"
                    rx="2"
                  />
                  {/* Net vertical lines */}
                  {[...Array(8)].map((_, i) => (
                    <line
                      key={`v${i}`}
                      x1={165 + i * 10}
                      y1="280"
                      x2={165 + i * 10}
                      y2="298"
                      stroke="#3d4556"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  ))}
                  {/* Net horizontal lines */}
                  {[...Array(3)].map((_, i) => (
                    <line
                      key={`h${i}`}
                      x1="157"
                      y1={283 + i * 5}
                      x2={pitchWidth - 157}
                      y2={283 + i * 5}
                      stroke="#3d4556"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  ))}
                  {/* Goal posts */}
                  <line x1="155" y1="278" x2="155" y2="300" stroke="#5a6378" strokeWidth="3" strokeLinecap="round" />
                  <line
                    x1={pitchWidth - 155}
                    y1="278"
                    x2={pitchWidth - 155}
                    y2="300"
                    stroke="#5a6378"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Crossbar */}
                  <line
                    x1="155"
                    y1="278"
                    x2={pitchWidth - 155}
                    y2="278"
                    stroke="#5a6378"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>

                {/* Shot positions */}
                {filteredShots.map((shot) => {
                  const pos = getShotPosition(shot)
                  const isGoal = shot.result === "goal"
                  const isSelected = selectedShot?.id === shot.id
                  const goalCenterX = pitchWidth / 2
                  const goalY = 278

                  return (
                    <g key={shot.id} className="cursor-pointer" onClick={() => setSelectedShot(shot)}>
                      {/* Connection line to goal for goals */}
                      {isGoal && (
                        <line
                          x1={pos.x}
                          y1={pos.y}
                          x2={goalCenterX}
                          y2={goalY}
                          stroke="#ef4444"
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          opacity={isSelected ? 1 : 0.7}
                        />
                      )}

                      {/* Shot marker */}
                      {isGoal ? (
                        <>
                          {/* Goal marker - ring with center dot */}
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={isSelected ? "14" : "11"}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth={isSelected ? "3" : "2.5"}
                          />
                          <circle cx={pos.x} cy={pos.y} r="5" fill="#ef4444" />
                        </>
                      ) : (
                        <>
                          {/* Non-goal - gear shape */}
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={isSelected ? "9" : "7"}
                            fill={shot.result === "saved" ? "#5a6378" : "#3d4556"}
                            stroke={isSelected ? "#9ca3af" : "none"}
                            strokeWidth="2"
                          />
                          {/* Small dots for gear effect */}
                          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                            const rad = (angle * Math.PI) / 180
                            const dotR = isSelected ? 5 : 4
                            const dotX = pos.x + dotR * Math.cos(rad)
                            const dotY = pos.y + dotR * Math.sin(rad)
                            return (
                              <circle
                                key={i}
                                cx={dotX}
                                cy={dotY}
                                r="2"
                                fill={shot.result === "saved" ? "#6b7280" : "#4b5563"}
                              />
                            )
                          })}
                        </>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Summary stats */}
            <div className="flex justify-center gap-10 py-2">
              <div className="text-center">
                <p className="text-3xl font-bold">{totalShots}</p>
                <p className="text-sm text-muted-foreground">Shots</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{totalGoals}</p>
                <p className="text-sm text-muted-foreground">Goals</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{totalXG.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">xG</p>
              </div>
            </div>
          </div>

          {/* Shot Details & Filters */}
          <div className="space-y-6">
            {/* Shot navigation */}
            {selectedShot && (
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/30">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateShot("prev")}
                  className="rounded-full bg-muted/50 hover:bg-muted h-10 w-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <div className="flex items-center gap-4">
                  {selectedShot.homeLogo ? (
                    <Image
                      src={selectedShot.homeLogo || "/placeholder.svg"}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-red-600/20 rounded flex items-center justify-center">
                      <div className="w-5 h-5 bg-red-600 rounded-sm" />
                    </div>
                  )}
                  <span className="font-bold text-xl">
                    {selectedShot.homeScore ?? 0} - {selectedShot.awayScore ?? 0}
                  </span>
                  {selectedShot.awayLogo ? (
                    <Image
                      src={selectedShot.awayLogo || "/placeholder.svg"}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-amber-600/20 rounded flex items-center justify-center">
                      <div className="w-5 h-5 bg-amber-600 rounded-sm" />
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateShot("next")}
                  className="rounded-full bg-muted/50 hover:bg-muted h-10 w-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Shot details */}
            {selectedShot && (
              <div className="flex gap-6">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between py-3 border-b border-border/30">
                    <span className="text-muted-foreground">Shot type</span>
                    <span className="font-semibold">{getTypeLabel(selectedShot.type)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border/30">
                    <span className="text-muted-foreground">Situation</span>
                    <span className="font-semibold">{getSituationLabel(selectedShot.situation)}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Result</span>
                    <span className={`font-semibold ${selectedShot.result === "goal" ? "text-green-500" : ""}`}>
                      {getResultLabel(selectedShot.result)}
                    </span>
                  </div>
                </div>

                {/* Mini goal with xG/xGOT */}
                <div className="flex flex-col items-center gap-3 p-4 border border-border/30 rounded-xl bg-muted/10 min-w-[140px]">
                  {/* Mini goal frame */}
                  <div className="relative w-24 h-14 border-2 border-muted-foreground/50 rounded-t-md overflow-hidden">
                    {/* Net lines */}
                    <div className="absolute inset-0">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute h-full border-l border-muted-foreground/20"
                          style={{ left: `${(i + 1) * 12.5}%` }}
                        />
                      ))}
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-full border-t border-muted-foreground/20"
                          style={{ top: `${(i + 1) * 20}%` }}
                        />
                      ))}
                    </div>
                    {selectedShot.result === "goal" && (
                      <div
                        className="absolute w-3 h-3 bg-white rounded-full shadow-lg"
                        style={{ left: "65%", top: "55%", transform: "translate(-50%, -50%)" }}
                      />
                    )}
                  </div>
                  <div className="flex gap-8">
                    <div className="text-center">
                      <p className="font-bold text-xl">{selectedShot.xG.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">xG</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-xl">{selectedShot.xGOT.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">xGOT</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="pt-2">
              <p className="font-semibold text-lg mb-4">Filter</p>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <Badge
                    key={filter.key}
                    variant={activeFilter === filter.key ? "default" : "outline"}
                    className={`cursor-pointer transition-all px-4 py-2 text-sm rounded-full ${
                      activeFilter === filter.key
                        ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                        : "hover:bg-muted border-border/50"
                    }`}
                    onClick={() => setActiveFilter(activeFilter === filter.key ? "all" : filter.key)}
                  >
                    {filter.label} <span className="ml-1.5 font-bold">{filter.count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
