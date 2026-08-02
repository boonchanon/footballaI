import { getAuthToken } from "@/lib/auth-client"

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "")

export function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {})
  const token = getAuthToken()
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.error || "Request failed"
    const error = new Error(message) as Error & { details?: unknown; status?: number; code?: string }
    error.status = response.status
    error.details = data?.details
    error.code = data?.details?.code
    throw error
  }

  return data as T
}

export const backendFetcher = <T>(path: string) => fetchJson<T>(path)
