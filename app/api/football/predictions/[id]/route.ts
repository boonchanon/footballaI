import { NextResponse } from "next/server"
import { getPredictions } from "@/lib/sportmonks"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const prediction = await getPredictions(id)

    if (!prediction || prediction.length === 0) {
      return NextResponse.json(
        {
          data: [],
          source: "sportmonks",
          matchId: id,
          error: "No prediction available for this match",
        },
        { status: 404 },
      )
    }

    const pred = Array.isArray(prediction) ? prediction[0] : prediction

    const formattedPrediction = {
      predictions: {
        winner: {
          id: null,
          name: "ไม่มีข้อมูล",
          comment: "",
        },
        percent: {
          home: pred.predictions?.home ? `${pred.predictions.home}%` : "0%",
          draw: pred.predictions?.draw ? `${pred.predictions.draw}%` : "0%",
          away: pred.predictions?.away ? `${pred.predictions.away}%` : "0%",
        },
        advice: "ไม่มีคำแนะนำ",
      },
      teams: {
        home: {
          id: null,
          name: "",
          logo: "",
        },
        away: {
          id: null,
          name: "",
          logo: "",
        },
      },
      comparison: null,
      h2h: [],
    }

    return NextResponse.json({
      data: [formattedPrediction],
      source: "sportmonks",
      matchId: id,
    })
  } catch (error) {
    console.error("Predictions API error:", error)

    return NextResponse.json(
      {
        data: [],
        source: "error",
        matchId: id,
        error: error instanceof Error ? error.message : "Failed to fetch predictions",
      },
      { status: 500 },
    )
  }
}
