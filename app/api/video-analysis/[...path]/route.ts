import { NextRequest } from "next/server"

import { requireAdminRoles } from "@/lib/server/auth"

export const runtime = "nodejs"

const apiBase = (process.env.VIDEO_ANALYSIS_API_BASE_URL || process.env.NEXT_PUBLIC_VIDEO_ANALYSIS_API_BASE_URL || "https://sn-gamestate-web.onrender.com").replace(/\/$/, "")
const serviceToken = process.env.VIDEO_ANALYSIS_SERVICE_TOKEN?.trim() || ""

// Listing and deleting jobs are admin-only; uploads, job status and result files keep their
// existing behaviour so <video>/<iframe> sources (which cannot send headers) still load.
function isProtected(method: string, path: string[]) {
  const route = path.join("/")
  return (method === "GET" && route === "api/jobs") || method === "DELETE"
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  if (isProtected(request.method, path)) {
    try {
      await requireAdminRoles(request, ["superadmin", "admin"])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin authentication required"
      return Response.json({ error: message }, { status: message === "Admin permission denied" ? 403 : 401 })
    }
  }

  const target = new URL(`${apiBase}/${path.join("/")}`)
  target.search = new URL(request.url).search
  const headers = new Headers(request.headers)
  headers.delete("host")
  // The admin session belongs to this app only.
  headers.delete("authorization")
  headers.delete("cookie")
  // Node's fetch rejects "Expect: 100-continue" (curl sends it for large uploads).
  headers.delete("expect")
  if (serviceToken) headers.set("x-service-token", serviceToken)
  // Do not remove content-length: the analysis service uses it to validate
  // multipart video uploads before it starts reading the request stream.
  try {
    const init = { method: request.method, headers, body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body, duplex: "half", cache: "no-store" } as unknown as RequestInit
    const response = await fetch(target, init)
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete("content-encoding")
    responseHeaders.delete("content-length")
    return new Response(response.body, { status: response.status, headers: responseHeaders })
  } catch {
    return new Response("Unable to connect to the video analysis service.", { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } })
  }
}

export const GET = proxy
export const POST = proxy
export const DELETE = proxy
