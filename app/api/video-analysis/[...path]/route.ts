export const runtime = "nodejs"

const apiBase = (process.env.VIDEO_ANALYSIS_API_BASE_URL || process.env.NEXT_PUBLIC_VIDEO_ANALYSIS_API_BASE_URL || "https://sn-gamestate-web.onrender.com").replace(/\/$/, "")

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const target = new URL(`${apiBase}/${path.join("/")}`)
  target.search = new URL(request.url).search
  const headers = new Headers(request.headers)
  headers.delete("host")
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
