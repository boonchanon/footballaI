import { NextResponse } from "next/server"

import { FOOTBALL_PREDICTION_API_BASE_URL, type PredictionRequest, parsePredictionResponse } from "@/lib/football-prediction"

export const maxDuration = 30

export async function GET() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${FOOTBALL_PREDICTION_API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const message = data?.error || data?.detail || "Prediction health check failed"
      return NextResponse.json({ error: message, raw: data }, { status: response.status })
    }

    return NextResponse.json(data ?? { ok: true })
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Prediction health check timed out"
        : "Prediction API is unavailable"

    return NextResponse.json({ error: message }, { status: 503 })
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: Request) {
  let body: PredictionRequest

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    console.log("[worldcup-prediction] request body", body)

    const response = await fetch(`${FOOTBALL_PREDICTION_API_BASE_URL}/predict-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    })

    const data = await response.json().catch(() => null)

    if (data?.ok === false) {
      const message = data?.error || data?.detail || "Prediction API request failed"
      console.log("[worldcup-prediction] upstream business error", { status: response.status, body: data })
      return NextResponse.json({ error: message, raw: data }, { status: response.ok ? 422 : response.status })
    }

    if (!response.ok) {
      const message = data?.detail || data?.error || "Prediction API request failed"
      console.log("[worldcup-prediction] upstream error", { status: response.status, body: data })
      return NextResponse.json({ error: message }, { status: response.status })
    }

    console.log("[worldcup-prediction] upstream response", data)

    return NextResponse.json({
      raw: data,
      parsed: parsePredictionResponse(data),
    })
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Prediction API timed out"
        : "Prediction API is unavailable"

    return NextResponse.json({ error: message }, { status: 503 })
  } finally {
    clearTimeout(timeout)
  }
}
