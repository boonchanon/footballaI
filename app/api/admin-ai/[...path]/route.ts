import { NextRequest, NextResponse } from "next/server"

const PREDICTION_API_BASE_URL =
  process.env.NEXT_PUBLIC_epl_PREDICTION_API_BASE_URL?.trim() ||
  "https://football-epl-prediction-api.onrender.com"

export const maxDuration = 60

function buildTargetUrl(pathSegments: string[], request: NextRequest) {
  const baseUrl = PREDICTION_API_BASE_URL.replace(/\/+$/, "")
  const path = pathSegments.map(encodeURIComponent).join("/")
  const target = new URL(`${baseUrl}/${path}`)

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value)
  })

  return target.toString()
}

function copyResponseHeaders(source: Headers) {
  const headers = new Headers()

  source.forEach((value, key) => {
    if (key.toLowerCase() === "content-encoding") return
    headers.set(key, value)
  })

  return headers
}

async function proxyRequest(request: NextRequest, params: { path?: string[] }) {
  const targetUrl = buildTargetUrl(params.path ?? [], request)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 55000)

  try {
    const headers = new Headers(request.headers)
    headers.delete("host")
    headers.delete("connection")
    headers.delete("content-length")

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      duplex: request.method === "GET" || request.method === "HEAD" ? undefined : ("half" as RequestDuplex),
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    })

    const responseHeaders = copyResponseHeaders(upstream.headers)
    const contentType = upstream.headers.get("content-type") || ""

    if (contentType.includes("application/json") || contentType.startsWith("text/")) {
      const text = await upstream.text()
      return new NextResponse(text, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      })
    }

    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Prediction service ใช้เวลาตอบนานเกินไป"
        : error instanceof Error
          ? error.message
          : "Prediction service unavailable"

    return NextResponse.json({ error: message }, { status: 503 })
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(request, await context.params)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(request, await context.params)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(request, await context.params)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(request, await context.params)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyRequest(request, await context.params)
}
