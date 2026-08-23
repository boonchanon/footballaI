import { footballService } from "../../service"

export const dynamic = "force-dynamic"

const STREAM_INTERVAL_MS = 15000

function buildFixturePayload(fixtures: any[]) {
  return fixtures.map((fixture: any) => ({
    id: fixture.id,
    roundNumber: fixture.roundNumber || 1,
    date: fixture.date,
    dateThai: fixture.dateThai,
    venue: fixture.venue?.name || "",
    teams: {
      home: fixture.teams?.home || {},
      away: fixture.teams?.away || {},
    },
    goals: {
      home: fixture.goals?.home ?? null,
      away: fixture.goals?.away ?? null,
    },
    status: fixture.status || {},
  }))
}

async function loadSnapshot(matchId: string | null, from?: string | null, to?: string | null) {
  const [liveFixtures, upcomingFixtures, finishedFixtures, events, lineups] = await Promise.all([
    footballService.getFixtures({ type: "live" }).catch(() => []),
    footballService.getFixtures({ type: "upcoming", from: from || undefined, to: to || undefined }).catch(() => []),
    footballService.getFixtures({ type: "finished", from: from || undefined, to: to || undefined }).catch(() => []),
    matchId ? footballService.getFixtureEvents(matchId).catch(() => []) : Promise.resolve([]),
    matchId ? footballService.getFixtureLineups(matchId).catch(() => []) : Promise.resolve([]),
  ])

  return {
    generatedAt: new Date().toISOString(),
    fixtures: {
      live: buildFixturePayload(Array.isArray(liveFixtures) ? liveFixtures : []),
      upcoming: buildFixturePayload(Array.isArray(upcomingFixtures) ? upcomingFixtures : []),
      finished: buildFixturePayload(Array.isArray(finishedFixtures) ? finishedFixtures : []),
    },
    matchId,
    events: Array.isArray(events) ? events : [],
    lineups: Array.isArray(lineups) ? lineups : [],
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get("matchId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      let interval: ReturnType<typeof setInterval> | null = null
      let keepAlive: ReturnType<typeof setInterval> | null = null

      const safeEnqueue = (payload: Uint8Array) => {
        if (closed) return false
        try {
          controller.enqueue(payload)
          return true
        } catch {
          closed = true
          return false
        }
      }

      const close = () => {
        if (closed) return
        closed = true
        if (interval) clearInterval(interval)
        if (keepAlive) clearInterval(keepAlive)
        try {
          controller.close()
        } catch {
          // Stream is already closed.
        }
      }

      const send = async () => {
        if (closed) return
        try {
          const payload = await loadSnapshot(matchId, from, to)
          safeEnqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(payload)}\n\n`))
        } catch (error) {
          if (closed) return
          const message = error instanceof Error ? error.message : "Failed to stream live football data"
          safeEnqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`))
        }
      }

      safeEnqueue(encoder.encode(`retry: ${STREAM_INTERVAL_MS}\n\n`))
      void send()

      interval = setInterval(() => {
        if (!closed) {
          void send()
        }
      }, STREAM_INTERVAL_MS)

      keepAlive = setInterval(() => {
        if (!closed) {
          safeEnqueue(encoder.encode(`: keep-alive\n\n`))
        }
      }, 10000)

      request.signal.addEventListener("abort", close)
    },
    cancel() {
      // No-op. Timers are cleared by the abort handler above.
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
