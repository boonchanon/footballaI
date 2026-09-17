const EASYSLIP_VERIFY_URL =
  process.env.EASYSLIP_VERIFY_URL?.trim() || "https://api.easyslip.com/v1/verify"

export type EasySlipVerifyResult = {
  ok: boolean
  amount: number | null
  reference: string
  recipientAccount: string
  recipientName: string
  transferredAt: string
  statusText: string
  raw: Record<string, any> | null
  error?: string
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function collectDeepValues(input: unknown, keys: string[], results: unknown[] = []) {
  if (!input || typeof input !== "object") return results
  if (Array.isArray(input)) {
    for (const item of input) collectDeepValues(item, keys, results)
    return results
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()))
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (normalizedKeys.has(key.toLowerCase())) results.push(value)
    if (value && typeof value === "object") collectDeepValues(value, keys, results)
  }
  return results
}

function pickDeepString(input: unknown, keys: string[]) {
  return pickString(...collectDeepValues(input, keys))
}

function pickDeepNumber(input: unknown, keys: string[]) {
  return pickNumber(...collectDeepValues(input, keys))
}

function pickReceiverString(receiver: Record<string, any> | null, keys: string[]) {
  if (!receiver) return ""
  return pickString(
    ...keys.flatMap((key) => [receiver[key], receiver.account?.[key], receiver.bank?.[key]]),
    ...collectDeepValues(receiver, keys),
  )
}

function normalizeError(raw: Record<string, any> | null, response: Response) {
  const message = pickString(raw?.message, raw?.error, raw?.code, raw?.data?.message, raw?.data?.error)
  if (message) return message
  if (response.status === 401 || response.status === 403) return "EASYSLIP_INVALID_API_TOKEN"
  if (response.status === 429) return "EASYSLIP_RATE_LIMITED"
  return `easyslip_verify_failed_${response.status}`
}

function parseTransferredAt(data: Record<string, any>) {
  const direct = pickDeepString(data, ["transferredAt", "transferAt", "transactionDateTime", "timestamp"])
  if (direct) return direct

  const date = pickDeepString(data, ["date", "transDate", "transactionDate"])
  const time = pickDeepString(data, ["time", "transTime", "transactionTime"])
  return date ? `${date}${time ? `T${time}` : ""}` : ""
}

function extractResult(response: Response, raw: Record<string, any> | null): EasySlipVerifyResult {
  const data = raw?.data && typeof raw.data === "object" ? raw.data : raw
  const receiver = data?.receiver && typeof data.receiver === "object" ? data.receiver : null
  const receiverAccount = receiver?.account && typeof receiver.account === "object" ? receiver.account : receiver
  const amount = pickNumber(
    data?.amount?.amount,
    data?.amount,
    data?.transAmount,
    data?.receiveAmount,
    pickDeepNumber(data, ["amount", "transAmount", "receiveAmount"]),
  )
  const reference = pickString(data?.transRef, data?.reference, data?.ref, pickDeepString(data, ["transRef", "transactionId", "reference", "ref"]))
  const recipientAccount = pickString(
    receiverAccount?.value,
    receiverAccount?.number,
    receiverAccount?.accountNumber,
    receiverAccount?.accountNo,
    receiverAccount?.proxy,
    receiverAccount?.proxyId,
    data?.receiverAccount,
    pickReceiverString(receiver, ["value", "number", "accountNumber", "accountNo", "proxy", "proxyId", "promptpay"]),
  )
  const recipientName = pickString(
    receiverAccount?.name,
    receiverAccount?.displayName,
    receiver?.name,
    receiver?.displayName,
    data?.recipientName,
    pickReceiverString(receiver, ["name", "displayName", "accountName", "receiverName", "recipientName"]),
  )
  const ok = response.ok && Boolean(data) && !raw?.error && raw?.status !== "error"

  return {
    ok,
    amount,
    reference,
    recipientAccount,
    recipientName,
    transferredAt: parseTransferredAt(data || {}),
    statusText: pickString(raw?.message, data?.message, raw?.status),
    raw,
    ...(ok ? {} : { error: normalizeError(raw, response) }),
  }
}

export function getEasySlipConfig() {
  return {
    token: process.env.EASYSLIP_API_TOKEN?.trim() || "",
    verifyUrl: EASYSLIP_VERIFY_URL,
    promptpayId: process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim() || process.env.PROMPTPAY_ID?.trim() || "",
    accountName: process.env.NEXT_PUBLIC_PROMPTPAY_NAME?.trim() || process.env.PROMPTPAY_NAME?.trim() || "FootballAI",
  }
}

export async function verifyEasySlipImage(image: File): Promise<EasySlipVerifyResult> {
  const config = getEasySlipConfig()
  if (!config.token) {
    return {
      ok: false,
      amount: null,
      reference: "",
      recipientAccount: "",
      recipientName: "",
      transferredAt: "",
      statusText: "",
      raw: null,
      error: "EASYSLIP_API_TOKEN_NOT_CONFIGURED",
    }
  }

  const formData = new FormData()
  formData.append("file", image, image.name || "slip-image")
  const response = await fetch(config.verifyUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
    body: formData,
    cache: "no-store",
  })
  const raw = (await response.json().catch(() => null)) as Record<string, any> | null
  return extractResult(response, raw)
}
