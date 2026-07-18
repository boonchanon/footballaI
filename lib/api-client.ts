export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "")

export function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {})
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.error || "Request failed"
    throw new Error(message)
  }

  return data as T
}

export const backendFetcher = <T>(path: string) => fetchJson<T>(path)
