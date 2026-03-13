"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle } from "lucide-react"

interface PlayerTraitsProps {
  position: string
  stats: {
    touches: number
    chancesCreated: number
    shotAttempts: number
    goals: number
    aerialDuelsWon: number
    defensiveContributions: number
  }
}

export function PlayerRadarChart({ position, stats }: PlayerTraitsProps) {
  const normalizeValue = (value: number) => {
    return Math.max(20, Math.min(value, 100))
  }

  const traits = [
    { label: "Touches", value: normalizeValue(stats.touches) },
    { label: "Chances created", value: normalizeValue(stats.chancesCreated) },
    { label: "Aerial duels won", value: normalizeValue(stats.aerialDuelsWon) },
    { label: "Defensive contributions", value: normalizeValue(stats.defensiveContributions) },
    { label: "Goals", value: normalizeValue(stats.goals) },
    { label: "Shot attempts", value: normalizeValue(stats.shotAttempts) },
  ]

  const size = 280
  const cx = size / 2
  const cy = size / 2
  const maxRadius = 85

  const getHexagonPoints = (radius: number) => {
    return traits
      .map((_, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
        const x = cx + radius * Math.cos(angle)
        const y = cy + radius * Math.sin(angle)
        return `${x},${y}`
      })
      .join(" ")
  }

  const getDataPoints = () => {
    return traits
      .map((trait, i) => {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
        const radius = (trait.value / 100) * maxRadius
        const x = cx + radius * Math.cos(angle)
        const y = cy + radius * Math.sin(angle)
        return `${x},${y}`
      })
      .join(" ")
  }

  const labelPositions = [
    { x: cx, y: 15, anchor: "middle", valueY: 5 }, // Top - Touches
    { x: size - 10, y: 70, anchor: "end", valueY: 60 }, // Top right - Chances created
    { x: size - 10, y: size - 60, anchor: "end", valueY: size - 50 }, // Bottom right - Aerial duels
    { x: cx, y: size - 5, anchor: "middle", valueY: size - 25 }, // Bottom - Defensive contributions
    { x: 10, y: size - 60, anchor: "start", valueY: size - 50 }, // Bottom left - Goals
    { x: 10, y: 70, anchor: "start", valueY: 60 }, // Top left - Shot attempts
  ]

  return (
    <Card className="border-border/50 bg-card h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-lg">Player traits</CardTitle>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Stats compared to other {position.toLowerCase()}s
          <HelpCircle className="w-4 h-4 cursor-help opacity-60" />
        </p>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center py-4">
        <div className="relative w-full max-w-[320px]">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
            {/* Background hexagons - 4 levels */}
            {[1, 0.75, 0.5, 0.25].map((scale, i) => (
              <polygon
                key={i}
                points={getHexagonPoints(maxRadius * scale)}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity={0.3}
              />
            ))}

            {/* Lines from center to vertices */}
            {traits.map((_, i) => {
              const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
              const x = cx + maxRadius * Math.cos(angle)
              const y = cy + maxRadius * Math.sin(angle)
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity={0.3}
                />
              )
            })}

            {/* Data polygon with gradient */}
            <defs>
              <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
            </defs>
            <polygon
              points={getDataPoints()}
              fill="url(#radarGradient)"
              fillOpacity="0.8"
              stroke="#ef4444"
              strokeWidth="2"
            />

            {/* Data points at vertices */}
            {traits.map((trait, i) => {
              const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
              const radius = (trait.value / 100) * maxRadius
              const x = cx + radius * Math.cos(angle)
              const y = cy + radius * Math.sin(angle)
              return <circle key={i} cx={x} cy={y} r="4" fill="#ef4444" stroke="white" strokeWidth="2" />
            })}

            {/* Labels with values */}
            {traits.map((trait, i) => {
              const pos = labelPositions[i]
              return (
                <g key={i}>
                  {/* Value */}
                  <text
                    x={pos.x}
                    y={pos.valueY}
                    textAnchor={pos.anchor as "start" | "middle" | "end"}
                    className="fill-red-500 font-bold"
                    fontSize="12"
                  >
                    {trait.value}%
                  </text>
                  {/* Label */}
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor={pos.anchor as "start" | "middle" | "end"}
                    className="fill-muted-foreground"
                    fontSize="9"
                  >
                    {trait.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
