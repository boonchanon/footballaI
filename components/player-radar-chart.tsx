"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle } from "lucide-react"

type RadarMetric = {
  label: string
  value: number | null
  displayValue: string
  max: number
}

interface PlayerRadarChartProps {
  title?: string
  subtitle?: string
  metrics: RadarMetric[]
}

export function PlayerRadarChart({
  title = "ตัวชี้วัดเพิ่มเติม",
  subtitle = "ใช้ค่าจริงจากฤดูกาลปัจจุบัน และย่อสเกลเฉพาะรูปกราฟ",
  metrics,
}: PlayerRadarChartProps) {
  const safeMetrics = metrics.slice(0, 6).map((metric) => {
    const numericValue = typeof metric.value === "number" && Number.isFinite(metric.value) ? metric.value : 0
    const normalized = metric.max > 0 ? Math.max(0.08, Math.min(numericValue / metric.max, 1)) : 0.08
    return {
      ...metric,
      normalized,
    }
  })

  const size = 280
  const cx = size / 2
  const cy = size / 2
  const maxRadius = 85

  const getHexagonPoints = (radius: number) => {
    return safeMetrics
      .map((_, index) => {
        const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
        const x = cx + radius * Math.cos(angle)
        const y = cy + radius * Math.sin(angle)
        return `${x},${y}`
      })
      .join(" ")
  }

  const getDataPoints = () => {
    return safeMetrics
      .map((metric, index) => {
        const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
        const radius = metric.normalized * maxRadius
        const x = cx + radius * Math.cos(angle)
        const y = cy + radius * Math.sin(angle)
        return `${x},${y}`
      })
      .join(" ")
  }

  const labelPositions = [
    { x: cx, y: 15, anchor: "middle", valueY: 5 },
    { x: size - 10, y: 70, anchor: "end", valueY: 60 },
    { x: size - 10, y: size - 60, anchor: "end", valueY: size - 50 },
    { x: cx, y: size - 5, anchor: "middle", valueY: size - 25 },
    { x: 10, y: size - 60, anchor: "start", valueY: size - 50 },
    { x: 10, y: 70, anchor: "start", valueY: 60 },
  ]

  return (
    <Card className="h-full border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          {subtitle}
          <HelpCircle className="h-4 w-4 cursor-help opacity-60" />
        </p>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-4">
        <div className="relative w-full max-w-[320px]">
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full overflow-visible">
            {[1, 0.75, 0.5, 0.25].map((scale, index) => (
              <polygon
                key={index}
                points={getHexagonPoints(maxRadius * scale)}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity={0.3}
              />
            ))}

            {safeMetrics.map((_, index) => {
              const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
              const x = cx + maxRadius * Math.cos(angle)
              const y = cy + maxRadius * Math.sin(angle)
              return (
                <line
                  key={index}
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

            <defs>
              <linearGradient id="realMetricRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c6ff00" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>

            <polygon
              points={getDataPoints()}
              fill="url(#realMetricRadarGradient)"
              fillOpacity="0.55"
              stroke="#b7ff00"
              strokeWidth="2.5"
            />

            {safeMetrics.map((metric, index) => {
              const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
              const radius = metric.normalized * maxRadius
              const x = cx + radius * Math.cos(angle)
              const y = cy + radius * Math.sin(angle)
              return <circle key={index} cx={x} cy={y} r="4.5" fill="#b7ff00" stroke="white" strokeWidth="2" />
            })}

            {safeMetrics.map((metric, index) => {
              const pos = labelPositions[index]
              return (
                <g key={metric.label}>
                  <text
                    x={pos.x}
                    y={pos.valueY}
                    textAnchor={pos.anchor as "start" | "middle" | "end"}
                    className="fill-lime-400 font-bold"
                    fontSize="12"
                  >
                    {metric.displayValue}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor={pos.anchor as "start" | "middle" | "end"}
                    className="fill-muted-foreground"
                    fontSize="9"
                  >
                    {metric.label}
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
