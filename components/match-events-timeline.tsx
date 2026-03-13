import { Badge } from "@/components/ui/badge"

export type MatchEventType =
  | "goal"
  | "yellow_card"
  | "red_card"
  | "substitution"
  | "added_time"
  | "half_time"
  | "full_time"

export interface MatchEvent {
  id: string
  type: MatchEventType
  minute: number
  team: "home" | "away"
  player?: string
  assist?: string
  score?: { home: number; away: number }
  playerOut?: string
  playerIn?: string
  addedMinutes?: number
  isPenalty?: boolean
  isOwnGoal?: boolean
  role?: string // e.g. "Coach"
}

interface MatchEventsTimelineProps {
  events: MatchEvent[]
  homeTeam: string
  awayTeam: string
  halfTimeScore?: { home: number; away: number }
  fullTimeScore?: { home: number; away: number }
  firstHalfAddedTime?: number
  secondHalfAddedTime?: number
}

export function MatchEventsTimeline({
  events,
  homeTeam,
  awayTeam,
  halfTimeScore,
  fullTimeScore,
  firstHalfAddedTime,
  secondHalfAddedTime,
}: MatchEventsTimelineProps) {
  // Sort events by minute
  const sortedEvents = [...events].sort((a, b) => a.minute - b.minute)

  // Split events into first half and second half
  const firstHalfEvents = sortedEvents.filter((e) => e.minute <= 45)
  const secondHalfEvents = sortedEvents.filter((e) => e.minute > 45)

  const renderEventIcon = (event: MatchEvent) => {
    switch (event.type) {
      case "goal":
        return (
          <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-background" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </div>
        )
      case "yellow_card":
        return <div className="w-4 h-5 bg-yellow-400 rounded-sm" />
      case "red_card":
        return <div className="w-4 h-5 bg-red-500 rounded-sm" />
      case "substitution":
        return (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 12h10M12 7l5 5-5 5M17 12H7m5-5l-5 5 5 5" />
            </svg>
          </div>
        )
      default:
        return null
    }
  }

  const renderEventContent = (event: MatchEvent, side: "home" | "away") => {
    const isLeft = side === "home"

    return (
      <div className={`flex items-center gap-3 ${isLeft ? "flex-row-reverse text-right" : "flex-row text-left"}`}>
        <div className="flex flex-col">
          {event.type === "goal" && (
            <>
              <div className="font-medium text-foreground">
                {event.player}{" "}
                <span className="text-destructive">
                  ({event.score?.home} - {event.score?.away})
                </span>
              </div>
              {event.assist && <div className="text-xs text-muted-foreground">assist by {event.assist}</div>}
              {event.isPenalty && <div className="text-xs text-muted-foreground">Penalty</div>}
            </>
          )}
          {event.type === "yellow_card" && (
            <>
              <div className="font-medium text-foreground">{event.player}</div>
              {event.role && <div className="text-xs text-muted-foreground">{event.role}</div>}
            </>
          )}
          {event.type === "red_card" && <div className="font-medium text-foreground">{event.player}</div>}
          {event.type === "substitution" && (
            <div className="flex flex-col">
              <div className="text-sm text-red-400 line-through">{event.playerOut}</div>
              <div className="text-sm text-green-400">{event.playerIn}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderEvent = (event: MatchEvent) => {
    const isHome = event.team === "home"

    return (
      <div key={event.id} className="flex items-center gap-4 py-3">
        {/* Home side content */}
        <div className="flex-1 flex justify-end">{isHome && renderEventContent(event, "home")}</div>

        {/* Home side icon */}
        <div className="w-8 flex justify-end">{isHome && renderEventIcon(event)}</div>

        {/* Minute */}
        <div className="w-12 flex justify-center">
          <Badge variant="secondary" className="font-mono text-sm px-2 py-1 bg-muted">
            {event.minute}'
          </Badge>
        </div>

        {/* Away side icon */}
        <div className="w-8 flex justify-start">{!isHome && renderEventIcon(event)}</div>

        {/* Away side content */}
        <div className="flex-1 flex justify-start">{!isHome && renderEventContent(event, "away")}</div>
      </div>
    )
  }

  const renderAddedTime = (minutes: number) => (
    <div className="flex justify-center py-3">
      <span className="text-sm text-muted-foreground">+{minutes} minutes added</span>
    </div>
  )

  const renderScoreLine = (label: string, score: { home: number; away: number }) => (
    <div className="flex justify-center py-4 border-y border-border">
      <span className="font-bold text-foreground">
        {label} {score.home} - {score.away}
      </span>
    </div>
  )

  return (
    <div className="bg-card rounded-lg p-6">
      <h3 className="text-xl font-semibold text-center mb-6">Events</h3>

      <div className="space-y-1">
        {/* First Half Events */}
        {firstHalfEvents.map((event) => renderEvent(event))}

        {/* First Half Added Time */}
        {firstHalfAddedTime && renderAddedTime(firstHalfAddedTime)}

        {/* Half Time Score */}
        {halfTimeScore && renderScoreLine("HT", halfTimeScore)}

        {/* Second Half Events */}
        {secondHalfEvents.map((event) => renderEvent(event))}

        {/* Second Half Added Time */}
        {secondHalfAddedTime && renderAddedTime(secondHalfAddedTime)}

        {/* Full Time Score */}
        {fullTimeScore && renderScoreLine("FT", fullTimeScore)}
      </div>
    </div>
  )
}
