import { Card, CardHeader } from "@/components/ui/card"
import { Clock } from "lucide-react"

interface MatchCardProps {
  homeTeam: string
  awayTeam: string
  time: string
  league: string
  homeLogo?: string
  awayLogo?: string
}

export function MatchCard({ homeTeam, awayTeam, time, league }: MatchCardProps) {
  return (
    <Card className="border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {time}
          </span>
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{league}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-full" />
            <span className="font-display text-lg">{homeTeam}</span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">VS</span>
          <div className="flex items-center gap-3">
            <span className="font-display text-lg">{awayTeam}</span>
            <div className="w-12 h-12 bg-muted rounded-full" />
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
