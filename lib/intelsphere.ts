type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

function normalizeCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  if (trimmed.endsWith("/chat/completions")) return trimmed
  return `${trimmed}/chat/completions`
}

function getMessageContent(messageContent: unknown): string | null {
  if (typeof messageContent === "string") return messageContent

  if (Array.isArray(messageContent)) {
    const text = messageContent
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text
        }
        return ""
      })
      .join("")
      .trim()

    return text || null
  }

  return null
}

export function extractJsonPayload<T>(content: string): T | null {
  const trimmed = content.trim()

  try {
    return JSON.parse(trimmed) as T
  } catch {}

  const match = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (!match?.[1]) return null

  try {
    return JSON.parse(match[1]) as T
  } catch {
    return null
  }
}

export async function createIntelSphereCompletion(messages: ChatMessage[], temperature = 0.4) {
  const apiKey = process.env.INTELSPHERE_API_KEY
  const baseUrl = process.env.INTELSPHERE_BASE_URL
  const model = process.env.INTELSPHERE_MODEL

  if (!apiKey || !baseUrl || !model) {
    return null
  }

  try {
    const response = await fetch(normalizeCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        stream: false,
        messages,
      }),
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return getMessageContent(data?.choices?.[0]?.message?.content)
  } catch {
    return null
  }
}
