const THUNDER_VERIFY_PAYLOAD_URL =
  process.env.THUNDER_VERIFY_URL?.trim() || "https://api.thunder.in.th/v1/verify"
const THUNDER_VERIFY_IMAGE_URL =
  process.env.THUNDER_VERIFY_IMAGE_URL?.trim() || "https://api.thunder.in.th/v2/verify/bank"

export type ThunderVerifyResult = {
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

function pickBoolean(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase()
      if (normalized === "true") return true
      if (normalized === "false") return false
    }
  }
  return null
}

function pickRecord(...values: unknown[]) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, any>
    }
  }
  return null
}

function pickDateString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) return value.trim()
    }
  }
  return ""
}

function collectDeepValues(input: unknown, matcher: (key: string, value: unknown) => boolean, results: unknown[] = []) {
  if (!input || typeof input !== "object") return results

  if (Array.isArray(input)) {
    for (const item of input) collectDeepValues(item, matcher, results)
    return results
  }

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (matcher(key, value)) {
      results.push(value)
    }

    if (value && typeof value === "object") {
      collectDeepValues(value, matcher, results)
    }
  }

  return results
}

function pickDeepString(input: unknown, keys: string[]) {
  const normalized = new Set(keys.map((item) => item.toLowerCase()))
  return pickString(
    ...collectDeepValues(input, (key, value) => {
      return normalized.has(key.toLowerCase()) && typeof value === "string"
    }),
  )
}

function pickDeepNumber(input: unknown, keys: string[]) {
  const normalized = new Set(keys.map((item) => item.toLowerCase()))
  return pickNumber(
    ...collectDeepValues(input, (key, value) => {
      return normalized.has(key.toLowerCase()) && (typeof value === "number" || typeof value === "string")
    }),
  )
}

function normalizeThunderError(message: string) {
  if (!message) return "thunder_verify_failed"
  if (/No number after minus sign in JSON/i.test(message)) return "invalid_payload"
  if (/Unexpected token|JSON/i.test(message)) return "invalid_payload"
  return message
}

function extractThunderError(record: Record<string, any> | null) {
  if (!record) return "thunder_verify_failed"
  const nested = record.data && typeof record.data === "object" ? record.data : null

  return normalizeThunderError(
    pickString(
      record.error,
      record.code,
      record.message,
      nested?.error,
      nested?.code,
      nested?.message,
      nested?.reason,
    ) || "thunder_verify_failed",
  )
}

function extractThunderResult(response: Response, raw: Record<string, any> | null): ThunderVerifyResult {
  const record = raw && typeof raw === "object" ? raw : null
  const nested = record?.data && typeof record.data === "object" ? record.data : null
  const rawSlip = nested?.rawSlip && typeof nested.rawSlip === "object" ? nested.rawSlip : null
  const rawSlipAmount = rawSlip?.amount && typeof rawSlip.amount === "object" ? rawSlip.amount : null
  const receiver =
    pickRecord(
      rawSlip?.receiver,
      rawSlip?.to,
      rawSlip?.destination,
      nested?.receiver,
      nested?.recipient,
      nested?.to,
      record?.receiver,
      record?.recipient,
    ) || null
  const sender =
    pickRecord(rawSlip?.sender, rawSlip?.from, nested?.sender, nested?.from, record?.sender, record?.from) || null

  const verified =
    response.ok &&
    (record?.ok === true ||
      record?.success === true ||
      String(record?.status || "").toLowerCase() === "success" ||
      pickBoolean(nested?.ok, nested?.success, nested?.verified) === true)

  const amount = pickNumber(
    record?.amount,
    nested?.amount,
    nested?.amountInSlip,
    nested?.amountInOrder,
    nested?.transAmount,
    nested?.receiveAmount,
    nested?.matchedAmount,
    rawSlipAmount?.amount,
    record?.transAmount,
    pickDeepNumber(record, ["amount", "transAmount", "receiveAmount", "matchedAmount", "amountInSlip"]),
  )

  const reference = pickString(
    record?.reference,
    record?.ref,
    record?.transRef,
    record?.transactionId,
    nested?.reference,
    nested?.ref,
    nested?.transRef,
    nested?.transactionId,
    rawSlip?.reference,
    rawSlip?.ref,
    rawSlip?.transRef,
    rawSlip?.transactionId,
    pickDeepString(record, ["reference", "ref", "transRef", "transactionId", "transactionNo", "slipNo"]),
  )

  const recipientAccount = pickString(
    receiver?.account,
    receiver?.accountNo,
    receiver?.accountNumber,
    receiver?.promptpay,
    receiver?.proxyId,
    receiver?.phoneNumber,
    nested?.receiverAccount,
    nested?.recipientAccount,
    nested?.toAccount,
    record?.receiverAccount,
    record?.recipientAccount,
    pickDeepString(record, [
      "account",
      "accountNo",
      "accountNumber",
      "promptpay",
      "proxyId",
      "phoneNumber",
      "receiverAccount",
      "recipientAccount",
      "toAccount",
      "destinationAccount",
    ]),
  )

  const recipientName = pickString(
    receiver?.name,
    receiver?.accountName,
    receiver?.displayName,
    nested?.receiverName,
    nested?.recipientName,
    record?.receiverName,
    record?.recipientName,
    pickDeepString(record, [
      "name",
      "accountName",
      "displayName",
      "receiverName",
      "recipientName",
      "fullName",
      "thaiName",
      "merchantName",
    ]),
  )

  const transferredAt = pickDateString(
    rawSlip?.transDate,
    rawSlip?.transactionDate,
    rawSlip?.paidAt,
    rawSlip?.timestamp,
    nested?.transDate,
    nested?.transactionDate,
    nested?.paidAt,
    nested?.timestamp,
    record?.transDate,
    record?.transactionDate,
    record?.paidAt,
    record?.timestamp,
    pickDeepString(record, ["transDate", "transactionDate", "paidAt", "timestamp", "transferAt", "dateTime"]),
  )

  const statusText = pickString(
    record?.status,
    record?.message,
    nested?.status,
    nested?.message,
    rawSlip?.status,
    sender?.bank,
  )

  if (!verified) {
    return {
      ok: false,
      amount,
      reference,
      recipientAccount,
      recipientName,
      transferredAt,
      statusText,
      raw: record,
      error: extractThunderError(record),
    }
  }

  return {
    ok: true,
    amount,
    reference,
    recipientAccount,
    recipientName,
    transferredAt,
    statusText,
    raw: record,
  }
}

export function getThunderConfig() {
  return {
    token: process.env.THUNDER_API_TOKEN?.trim() || "",
    verifyUrl: THUNDER_VERIFY_PAYLOAD_URL,
    verifyImageUrl: THUNDER_VERIFY_IMAGE_URL,
    promptpayId: process.env.NEXT_PUBLIC_PROMPTPAY_ID?.trim() || process.env.PROMPTPAY_ID?.trim() || "",
    accountName: process.env.NEXT_PUBLIC_PROMPTPAY_NAME?.trim() || process.env.PROMPTPAY_NAME?.trim() || "FootballAI",
  }
}

export async function verifyThunderSlipPayload(payload: string): Promise<ThunderVerifyResult> {
  const config = getThunderConfig()
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
      error: "THUNDER_API_TOKEN_NOT_CONFIGURED",
    }
  }

  const response = await fetch(config.verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({ payload }),
    cache: "no-store",
  })

  const raw = (await response.json().catch(() => null)) as Record<string, any> | null
  return extractThunderResult(response, raw)
}

export async function verifyThunderSlipImage(
  image: File,
  options: {
    amount: number
    checkDuplicate?: boolean
  },
): Promise<ThunderVerifyResult> {
  const config = getThunderConfig()
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
      error: "THUNDER_API_TOKEN_NOT_CONFIGURED",
    }
  }

  const formData = new FormData()
  formData.append("image", image, image.name || "slip-image")
  formData.append("matchAmount", String(options.amount))
  formData.append("checkDuplicate", options.checkDuplicate === false ? "false" : "true")

  const response = await fetch(config.verifyImageUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
    body: formData,
    cache: "no-store",
  })

  const raw = (await response.json().catch(() => null)) as Record<string, any> | null
  return extractThunderResult(response, raw)
}
