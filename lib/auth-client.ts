export interface AuthUser {
  id: string
  name: string
  email: string
  avatar?: string
  favoriteTeam?: string
  bio?: string
  role?: string
  createdAt?: string
}

interface AuthSession {
  token: string
  user: AuthUser
}

const STORAGE_KEY = "footballai_auth"
const EVENT_NAME = "footballai-auth-changed"

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function clearAuthSession() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function getAuthToken() {
  return getAuthSession()?.token || null
}

export function subscribeToAuthSession(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }

  window.addEventListener(EVENT_NAME, listener)
  window.addEventListener("storage", handleStorage)

  return () => {
    window.removeEventListener(EVENT_NAME, listener)
    window.removeEventListener("storage", handleStorage)
  }
}
