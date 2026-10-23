// Browser helpers that keep working when the site is opened over plain http on a LAN address
// (e.g. http://10.x.x.x:3000). Browsers only expose crypto.randomUUID and navigator.clipboard
// in secure contexts (https or localhost), so each helper falls back when they are missing.

export function isSecureBrowserContext() {
  return typeof window !== "undefined" && window.isSecureContext === true
}

// RFC 4122 v4 id. crypto.getRandomValues is available in insecure contexts too.
export function randomId(): string {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID()
    } catch {
      // Some browsers expose the function but throw outside secure contexts.
    }
  }
  const bytes = new Uint8Array(16)
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Copies text; falls back to a hidden textarea + execCommand where the Clipboard API is blocked.
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && isSecureBrowserContext()) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to the legacy path
    }
  }
  if (typeof document === "undefined") return false
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.top = "-1000px"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)
  let copied = false
  try {
    copied = document.execCommand("copy")
  } catch {
    copied = false
  } finally {
    textarea.remove()
  }
  return copied
}
