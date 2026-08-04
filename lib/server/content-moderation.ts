import { randomUUID } from "crypto"

import { createCommunityNotification } from "./community-notifications"
import { extractImageTextWithAI, moderateImageWithAI, moderateTextWithAI, type AIModerationOutcome } from "./ai-moderation"
import { ModerationLog, User } from "./models"

export const PROFANITY_TERMS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "motherfucker",
  "fucking",
  "wtf",
  "เหี้ย",
  "เชี่ย",
  "สัส",
  "ส้นตีน",
  "ควย",
  "หี",
  "เย็ด",
  "ระยำ",
  "ห่า",
  "ฉิบหาย",
  "ชิบหาย",
  "เหี้ยไร",
  "เ-ี้ย",
]

export const HARASSMENT_PATTERNS = [
  "shut up idiot",
  "dumbass",
  "piece of shit",
  "ไอ้โง่",
  "อีดอก",
  "มึงโง่",
  "ไอ้ควาย",
  "มึงควาย",
  "อีสัส",
  "ไอ้สัส",
  "แม่งโง่",
  "ไอ้เหี้ย",
  "อีเหี้ย",
  "ไอ้ห่า",
  "ควายเอ๊ย",
]

export const THREAT_PATTERNS = ["go die", "kill yourself", "มึงตาย", "ฆ่าตัวตาย", "เจอกูแน่", "จะฆ่า", "ระวังตัวไว้"]

export const GAMBLING_TERMS = [
  "พนัน",
  "แทงบอล",
  "สล็อต",
  "คาสิโน",
  "บาคาร่า",
  "หวย",
  "bet",
  "พนันบอล",
  "gamb",
  "casino",
  "slot",
  "ufabet",
]

export const GAMBLING_PROMOTION_PATTERNS = [
  "เครดิตฟรี",
  "แอดไลน์",
  "สมัคร",
  "รับโปร",
  "ฝากถอน",
  "โปรแตก",
  "โบนัส",
  "line id",
  "telegram",
  "join now",
  "bonus",
  "promo code",
  "deposit",
]

export const BLOCKED_GAMBLING_DOMAINS = ["ufabet.com", "bet365.com", "1xbet.com", "bk8.com", "w88.com", "m98.com"]

const WARNING_CONTEXT_PATTERNS = ["จับเว็บพนัน", "เตือนภัย", "ระวัง", "scam", "fraud", "arrested", "warning"]
const RISK_REVIEW_PATTERNS = [
  "มึง",
  "กู",
  "แม่ง",
  "เสือก",
  "ถ่อย",
  "ดูถูก",
  "เหยียด",
  "spam",
  "click here",
  "dm me",
  "inbox me",
]
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\u2060\uFEFF]/g
const CONTACT_PATTERN = /(line\s*id|@[\w.-]{3,}|telegram|t\.me\/|wa\.me\/|\b0\d{8,9}\b|\+\d{8,15})/gi
const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi

export type ModerationStatus = "approved" | "pending_review" | "rejected"
export type ModerationProvider = "local" | "openai" | "combined" | "manual"
export type ModerationContentType = "post" | "comment" | "story" | "image" | "video" | "room_message" | "thread_root" | "match_poll"
export type LocalRiskLevel = "safe" | "risky" | "severe"

export type ModerationDecision = {
  status: ModerationStatus
  reasons: string[]
  scores: Record<string, number>
  provider: ModerationProvider
  aiAvailable: boolean
  aiErrorCode?: string
  localRiskLevel: LocalRiskLevel
  flags: {
    profanity: boolean
    harassment: boolean
    threat: boolean
    gambling: boolean
    blockedDomain: boolean
    promotion: boolean
    evasiveText: boolean
    aiFlagged: boolean
  }
  metadata?: Record<string, unknown>
}

type TextModerationInput = {
  title?: string
  content: string
  urls?: string[]
  imageUrls?: string[]
}

function envFlag(name: string, fallback = true) {
  const value = process.env[name]
  if (typeof value === "undefined") return fallback
  return value === "true"
}

function shouldPendingOnAIFailure() {
  return String(process.env.IMAGE_MODERATION_FAIL_MODE || process.env.MODERATION_FAIL_MODE || "pending").trim().toLowerCase() !== "allow"
}

export function normalizeText(input: string) {
  return input
    .normalize("NFKC")
    .replace(ZERO_WIDTH_REGEX, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function compactNormalizedText(input: string) {
  return normalizeText(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

export function extractUrls(text: string) {
  const rawMatches = text.match(URL_PATTERN) || []
  return rawMatches
    .map((item) => item.trim())
    .map((item) => (item.startsWith("http://") || item.startsWith("https://") ? item : `https://${item}`))
    .filter(Boolean)
}

export function getUrlHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ""
  }
}

export function isBlockedGamblingDomain(hostname: string) {
  const normalizedHost = hostname.toLowerCase()
  return BLOCKED_GAMBLING_DOMAINS.some((blockedDomain) => normalizedHost === blockedDomain || normalizedHost.endsWith(`.${blockedDomain}`))
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildTermRegex(term: string) {
  const normalized = normalizeText(term).toLowerCase()
  const escaped = escapeRegex(normalized)
  const isAsciiWord = /^[a-z0-9\s@./+-]+$/i.test(normalized)
  return new RegExp(isAsciiWord ? `(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])` : escaped, "iu")
}

function buildFlexibleAsciiRegex(term: string) {
  const normalized = normalizeText(term).toLowerCase()
  const pieces = [...normalized].map((char) => {
    if (/[a-z0-9]/i.test(char)) return escapeRegex(char)
    if (char === ".") return "\\s*\\.\\s*"
    return "[^a-z0-9]*"
  })
  return new RegExp(`(?:^|[^a-z0-9])${pieces.join("[^a-z0-9]*")}(?![a-z0-9.])`, "iu")
}

function matchTerms(normalizedText: string, compactText: string, terms: readonly string[]) {
  const lowerText = normalizedText.toLowerCase()
  const matched = terms.filter((term) => {
    const normalizedTerm = normalizeText(term).toLowerCase()
    const compactTerm = compactNormalizedText(term)
    const allowCompactMatch =
      compactTerm.length >= 4 ||
      /^[a-z0-9]/i.test(compactTerm) ||
      /[\s./@+_-]/.test(normalizedTerm)
    if (buildTermRegex(term).test(lowerText)) return true
    if (allowCompactMatch && compactTerm && compactText.includes(compactTerm)) return true
    if (/^[a-z0-9.\s@/+_-]+$/i.test(normalizedTerm) && buildFlexibleAsciiRegex(term).test(lowerText)) return true
    return false
  })
  return {
    matched,
    hasMatch: matched.length > 0,
    count: matched.length,
  }
}

function containsBlockedDomainText(normalizedText: string, compactText: string) {
  const lowerText = normalizedText.toLowerCase()
  return BLOCKED_GAMBLING_DOMAINS.some((domain) => {
    const escaped = escapeRegex(domain.toLowerCase())
    const compactDomain = compactNormalizedText(domain)
    return (
      new RegExp(`(^|[^a-z0-9.])${escaped}(?=$|[^a-z0-9.])`, "i").test(lowerText) ||
      buildFlexibleAsciiRegex(domain).test(lowerText) ||
      compactText === compactDomain ||
      compactText.includes(`${compactDomain}สมัคร`) ||
      compactText.includes(`${compactDomain}เครดิตฟรี`) ||
      compactText.includes(`สมัคร${compactDomain}`) ||
      compactText.includes(`เข้า${compactDomain}`)
    )
  })
}

function evaluateTextSignals(input: TextModerationInput) {
  const joinedText = [input.title || "", input.content, ...(input.urls || [])].filter(Boolean).join(" ")
  const normalized = normalizeText(joinedText)
  const urls = [...new Set([...(input.urls || []), ...extractUrls(joinedText)])]
  const hostnames = urls.map(getUrlHostname).filter(Boolean)
  const compact = compactNormalizedText(joinedText)
  const profanityMatches = matchTerms(normalized, compact, PROFANITY_TERMS)
  const harassmentMatches = matchTerms(normalized, compact, HARASSMENT_PATTERNS)
  const threatMatches = matchTerms(normalized, compact, THREAT_PATTERNS)
  const gamblingMatches = matchTerms(normalized, compact, GAMBLING_TERMS)
  const promotionMatches = matchTerms(normalized, compact, GAMBLING_PROMOTION_PATTERNS)
  const riskMatches = matchTerms(normalized, compact, RISK_REVIEW_PATTERNS)
  const warningContextMatches = matchTerms(normalized, compact, WARNING_CONTEXT_PATTERNS)
  const profanity = profanityMatches.hasMatch
  const harassment = harassmentMatches.hasMatch
  const threat = threatMatches.hasMatch
  const gambling = gamblingMatches.hasMatch
  const profanityCount = profanityMatches.count
  const harassmentCount = harassmentMatches.count
  const contactMatches = [...new Set(Array.from(normalized.matchAll(CONTACT_PATTERN)).map((match) => String(match[0] || "").trim()).filter(Boolean))]
  const promotion = promotionMatches.hasMatch || contactMatches.length > 0
  const blockedDomain = hostnames.some(isBlockedGamblingDomain) || containsBlockedDomainText(normalized, compact)
  const warningContext = warningContextMatches.hasMatch
  const riskReview = riskMatches.hasMatch
  const riskReviewCount = riskMatches.count
  const evasiveText = normalized !== joinedText.trim() || compact.length !== normalized.toLowerCase().replace(/\s+/g, "").length

  return {
    normalized,
    compact,
    urls,
    hostnames,
    profanity,
    harassment,
    threat,
    gambling,
    profanityCount,
    harassmentCount,
    promotion,
    blockedDomain,
    warningContext,
    riskReview,
    riskReviewCount,
    evasiveText,
    matchedTerms: {
      profanity: profanityMatches.matched,
      harassment: harassmentMatches.matched,
      threat: threatMatches.matched,
      gambling: gamblingMatches.matched,
      promotion: promotionMatches.matched,
      warning: warningContextMatches.matched,
      risky: riskMatches.matched,
      contacts: contactMatches,
    },
  }
}

function mergeReasons(...reasonGroups: Array<string[]>) {
  return [...new Set(reasonGroups.flat().filter(Boolean))]
}

function mergeMetadata(...metadataGroups: Array<Record<string, unknown> | undefined>) {
  return metadataGroups.reduce<Record<string, unknown>>((acc, metadata) => {
    if (!metadata) return acc
    return { ...acc, ...metadata }
  }, {})
}

function summarizePreview(text: string, maxLength = 220) {
  const normalized = normalizeText(text)
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function mapTextReasonToImageReason(reason: string) {
  switch (reason) {
    case "text:gambling":
      return "image:gambling-text"
    case "text:gambling-promotion":
      return "image:gambling-promotion"
    case "text:promo-contact":
      return "image:contact-spam"
    case "url:blocked-gambling-domain":
      return "image:blocked-domain"
    case "context:warning-gambling":
      return "image:warning-context"
    case "text:risky-language":
      return "image:risky-text"
    case "text:profanity":
      return "image:unsafe-text"
    case "text:harassment":
      return "image:unsafe-text"
    case "text:threat":
      return "image:unsafe-text"
    case "text:evasive-pattern":
      return "image:evasive-text"
    default:
      return `image:${reason.replace(/[:/]/g, "-")}`
  }
}

function mapImageSafetyReason(reason: string) {
  if (reason === "ai:sexual/minors") return "image:sexual-minors"
  if (reason === "ai:violence/graphic") return "image:graphic-violence"
  if (reason.startsWith("ai:sexual")) return "image:sexual-content"
  if (reason.startsWith("ai:violence")) return "image:violence"
  if (reason.startsWith("ai:")) return "image:unsafe-image"
  return reason
}

function getDecisionPriority(status: ModerationStatus) {
  if (status === "rejected") return 3
  if (status === "pending_review") return 2
  return 1
}

function combineDecisionStatuses(...statuses: ModerationStatus[]) {
  return statuses.sort((a, b) => getDecisionPriority(b) - getDecisionPriority(a))[0] || "approved"
}

function mergeScores(...scoreGroups: Array<Record<string, number> | undefined>) {
  const merged: Record<string, number> = {}
  for (const scores of scoreGroups) {
    for (const [key, value] of Object.entries(scores || {})) {
      merged[key] = Math.max(merged[key] || 0, value)
    }
  }
  return merged
}

function buildEmptyFlags() {
  return {
    profanity: false,
    harassment: false,
    threat: false,
    gambling: false,
    blockedDomain: false,
    promotion: false,
    evasiveText: false,
    aiFlagged: false,
  }
}

function aiFailureDecision(): ModerationDecision {
  return {
    status: shouldPendingOnAIFailure() ? "pending_review" : "approved",
    reasons: [],
    scores: {},
    provider: "local",
    aiAvailable: false,
    aiErrorCode: "ai_unavailable",
    localRiskLevel: "safe",
    flags: buildEmptyFlags(),
  }
}

function combineWithAI(local: ModerationDecision, ai: AIModerationOutcome): ModerationDecision {
  if (ai.rawStatus === "missing_key" || ai.rawStatus === "disabled") {
    if (process.env.NODE_ENV === "production" && shouldPendingOnAIFailure() && local.status !== "approved") {
      return {
        ...local,
        status: local.status === "rejected" ? "rejected" : "pending_review",
        aiAvailable: false,
        aiErrorCode: ai.rawStatus,
      }
    }
    return { ...local, aiAvailable: false, aiErrorCode: ai.rawStatus }
  }

  if (ai.rawStatus === "error") {
    if (shouldPendingOnAIFailure() && local.status !== "approved") {
      return {
        ...local,
        status: local.status === "rejected" ? "rejected" : "pending_review",
        aiAvailable: false,
        aiErrorCode: "ai_error",
      }
    }
    return { ...local, aiAvailable: false, aiErrorCode: "ai_error" }
  }

  if (!ai.flagged) {
    return {
      ...local,
      provider: local.provider === "local" ? "combined" : local.provider,
      scores: { ...local.scores, ...ai.scores },
      aiAvailable: true,
      aiErrorCode: undefined,
    }
  }

  const severeAI =
    ai.categories["sexual/minors"] ||
    ai.categories["violence/graphic"] ||
    ai.categories["hate/threatening"] ||
    ai.categories["harassment/threatening"]

  return {
    ...local,
    status: local.status === "rejected" || severeAI ? "rejected" : "pending_review",
    reasons: mergeReasons(local.reasons, ai.reasons),
    scores: { ...local.scores, ...ai.scores },
    provider: "combined",
    aiAvailable: true,
    aiErrorCode: undefined,
    flags: {
      ...local.flags,
      aiFlagged: true,
    },
  }
}

export async function moderateCommunityText(input: TextModerationInput): Promise<ModerationDecision> {
  const signals = evaluateTextSignals(input)
  const reasons: string[] = []
  const scores: Record<string, number> = {}
  let status: ModerationStatus = "approved"
  let localRiskLevel: LocalRiskLevel = "safe"

  if (signals.profanity) {
    reasons.push("text:profanity")
    scores.profanity = Math.min(1, 0.45 + signals.profanityCount * 0.18)
    status = "pending_review"
    localRiskLevel = "risky"
  }
  if (signals.harassment) {
    reasons.push("text:harassment")
    scores.harassment = Math.min(1, 0.52 + signals.harassmentCount * 0.18)
    status = "pending_review"
    if (localRiskLevel === "safe") localRiskLevel = "risky"
  }
  if (signals.threat) {
    reasons.push("text:threat")
    scores.threat = 0.97
    status = "rejected"
    localRiskLevel = "severe"
  }
  if (signals.gambling) {
    reasons.push("text:gambling")
    scores.gambling = 0.88
    if (status === "approved") {
      status = "pending_review"
    }
    if (localRiskLevel === "safe") localRiskLevel = "risky"
  }
  if (signals.riskReview && !signals.profanity && !signals.harassment && status === "approved") {
    reasons.push("text:risky-language")
    scores.riskReview = Math.min(1, 0.34 + signals.riskReviewCount * 0.1)
    status = "pending_review"
    localRiskLevel = "risky"
  }
  if (signals.promotion && !signals.blockedDomain && !signals.warningContext && status === "approved") {
    reasons.push("text:promo-contact")
    scores.promotion = 0.72
    status = "pending_review"
    if (localRiskLevel === "safe") localRiskLevel = "risky"
  }
  if (signals.evasiveText && (signals.profanity || signals.harassment || signals.gambling)) {
    reasons.push("text:evasive-pattern")
    scores.evasiveText = 0.61
    if (status === "approved") status = "pending_review"
    if (localRiskLevel === "safe") localRiskLevel = "risky"
  }
  if (signals.blockedDomain) {
    reasons.push("url:blocked-gambling-domain")
    scores.blockedDomain = 1
    status = "rejected"
    localRiskLevel = "severe"
  }
  if (signals.gambling && signals.promotion && !signals.warningContext) {
    reasons.push("text:gambling-promotion")
    scores.gamblingPromotion = 0.98
    status = "rejected"
    localRiskLevel = "severe"
  }
  if (signals.warningContext && signals.gambling && status !== "rejected") {
    status = "pending_review"
    reasons.push("context:warning-gambling")
    if (localRiskLevel === "safe") localRiskLevel = "risky"
  }

  if (!signals.profanity && !signals.harassment && !signals.threat && !signals.gambling && !signals.blockedDomain && !signals.riskReview && !signals.promotion) {
    status = "approved"
    localRiskLevel = "safe"
  }

  const localDecision: ModerationDecision = {
    status,
    reasons: [...new Set(reasons)],
    scores,
    provider: "local",
    aiAvailable: false,
    aiErrorCode: undefined,
    localRiskLevel,
    flags: {
      profanity: signals.profanity,
      harassment: signals.harassment,
      threat: signals.threat,
      gambling: signals.gambling,
      blockedDomain: signals.blockedDomain,
      promotion: signals.promotion,
      evasiveText: signals.evasiveText,
      aiFlagged: false,
    },
  }

  if (!envFlag("CONTENT_MODERATION_ENABLED", true)) {
    return { ...localDecision, status: "approved", reasons: [], scores: {}, provider: "local" }
  }

  if (!envFlag("AI_MODERATION_ENABLED", true)) {
    return localDecision
  }

  if (localDecision.localRiskLevel === "severe") {
    return localDecision
  }

  const ai = await moderateTextWithAI([input.title || "", input.content].filter(Boolean).join("\n\n"))
  return combineWithAI(localDecision, ai)
}

export async function moderateCommunityImage(params: { imageUrl?: string; dataUrl?: string }): Promise<ModerationDecision> {
  if (!envFlag("CONTENT_MODERATION_ENABLED", true) || !envFlag("IMAGE_MODERATION_ENABLED", true)) {
    return {
      status: "pending_review",
      reasons: ["image:image-moderation-disabled"],
      scores: {},
      provider: "local",
      aiAvailable: false,
      aiErrorCode: "disabled",
      localRiskLevel: "risky",
      flags: buildEmptyFlags(),
      metadata: {
        imageSafetyAttempted: false,
        imageSafetyAvailable: false,
        imageSafetySucceeded: false,
        imageTextExtractionAttempted: false,
        imageTextExtractionAvailable: false,
        imageTextExtractionSucceeded: false,
        moderationAttempted: false,
      },
    }
  }

  const ai = await moderateImageWithAI(params)
  const imageSafetyAvailable = ai.rawStatus === "ok"
  const qrDetectionEnabled = envFlag("IMAGE_QR_DETECTION_ENABLED", true)
  const imageSafetyReasons = imageSafetyAvailable ? ai.reasons.map(mapImageSafetyReason) : []
  const severe = imageSafetyAvailable && (ai.categories["sexual/minors"] || ai.categories["violence/graphic"])
  const baseDecision: ModerationDecision = imageSafetyAvailable
    ? {
        status: severe ? "rejected" : ai.flagged ? "pending_review" : "approved",
        reasons: imageSafetyReasons,
        scores: ai.scores,
        provider: "openai",
        aiAvailable: true,
        aiErrorCode: undefined,
        localRiskLevel: severe ? "severe" : ai.flagged ? "risky" : "safe",
        flags: {
          ...buildEmptyFlags(),
          aiFlagged: ai.flagged,
        },
        metadata: {
          imageSafetyAttempted: true,
          imageSafetyAvailable: true,
          imageSafetySucceeded: true,
          imageSafetyCategories: Object.keys(ai.categories).filter((key) => ai.categories[key]),
          imageTextExtractionAvailable: false,
          providerStatus: ai.diagnostic?.providerStatus || "ready",
          errorCategory: null,
          retryable: false,
          attempts: ai.diagnostic?.attempts || 1,
          lastRequestId: ai.diagnostic?.requestId || null,
          diagnosticAction: ai.diagnostic?.recommendedAction || "none",
        },
      }
    : {
        status: "pending_review",
        reasons: ["image:image-safety-unavailable"],
        scores: {},
        provider: "local",
        aiAvailable: false,
        aiErrorCode: ai.errorCode || ai.rawStatus,
        localRiskLevel: "risky",
        flags: buildEmptyFlags(),
        metadata: {
          imageSafetyAttempted: envFlag("IMAGE_MODERATION_ENABLED", true),
          imageSafetyAvailable: false,
          imageSafetySucceeded: false,
          imageTextExtractionAvailable: false,
          imageSafetyErrorCode: ai.errorCode || ai.rawStatus,
          providerStatus: ai.diagnostic?.providerStatus || "unavailable",
          errorCategory: ai.diagnostic?.category || ai.errorCode || ai.rawStatus,
          retryable: ai.diagnostic?.retryable || false,
          attempts: ai.diagnostic?.attempts || 1,
          lastRequestId: ai.diagnostic?.requestId || null,
          diagnosticAction: ai.diagnostic?.recommendedAction || "none",
        },
      }

  const extraction = await extractImageTextWithAI(params)
  if (extraction.rawStatus !== "ok") {
    return {
      ...baseDecision,
      status: baseDecision.status === "rejected" ? "rejected" : "pending_review",
      reasons:
        baseDecision.status === "rejected"
          ? baseDecision.reasons
          : mergeReasons(baseDecision.reasons, ["image:image-text-extraction-unavailable"]),
      localRiskLevel: baseDecision.status === "rejected" ? "severe" : "risky",
      metadata: mergeMetadata(baseDecision.metadata, {
        imageTextExtractionAttempted: envFlag("IMAGE_TEXT_EXTRACTION_ENABLED", true),
        imageTextExtractionAvailable: false,
        imageTextExtractionSucceeded: false,
        imageTextExtractionErrorCode: extraction.errorCode || extraction.rawStatus,
        providerStatus: extraction.diagnostic?.providerStatus || baseDecision.metadata?.providerStatus || "unavailable",
        errorCategory: extraction.diagnostic?.category || extraction.errorCode || baseDecision.metadata?.errorCategory || null,
        retryable: extraction.diagnostic?.retryable || false,
        attempts: Math.max(
          Number(baseDecision.metadata?.attempts || 0),
          Number(extraction.diagnostic?.attempts || 1),
        ),
        lastRequestId: extraction.diagnostic?.requestId || baseDecision.metadata?.lastRequestId || null,
        diagnosticAction: extraction.diagnostic?.recommendedAction || baseDecision.metadata?.diagnosticAction || "none",
        qrAttempted: qrDetectionEnabled,
        qrSucceeded: false,
      }),
    }
  }

  const extractedContent = [extraction.extractedText, ...extraction.contactHints].filter(Boolean).join("\n")
  const textUrls = [...extraction.urls, ...(qrDetectionEnabled ? extraction.qrUrls : [])]
  const textSignals = evaluateTextSignals(
    {
      content: extractedContent,
      urls: textUrls,
    },
  )
  const textDecision =
    extractedContent || textUrls.length > 0
      ? await moderateCommunityText({
          content: extractedContent,
          urls: textUrls,
        })
      : null

  const qrHasBlockedDomain = qrDetectionEnabled && extraction.qrUrls.some((url) => isBlockedGamblingDomain(getUrlHostname(url)))
  const contactWithGambling = Boolean(textDecision?.flags.gambling && (textDecision.flags.promotion || extraction.contactHints.length > 0))
  const imageTextReasons = textDecision ? textDecision.reasons.map(mapTextReasonToImageReason) : []
  if (qrHasBlockedDomain) imageTextReasons.push("image:qr-gambling-link")
  if (contactWithGambling) imageTextReasons.push("image:contact-spam")

  const combinedStatus = combineDecisionStatuses(
    baseDecision.status,
    qrHasBlockedDomain ? "rejected" : textDecision?.status || "approved",
  )
  const combinedReasons = mergeReasons(baseDecision.reasons, imageTextReasons)
  const combinedScores = mergeScores(baseDecision.scores, textDecision?.scores, qrHasBlockedDomain ? { qrBlockedDomain: 1 } : undefined)
  const localRiskLevel: LocalRiskLevel =
    combinedStatus === "rejected"
      ? "severe"
      : combinedStatus === "pending_review"
        ? "risky"
        : baseDecision.localRiskLevel

  return {
    status: combinedStatus,
    reasons: combinedReasons,
    scores: combinedScores,
    provider: textDecision ? "combined" : baseDecision.provider,
    aiAvailable: true,
    aiErrorCode: baseDecision.aiErrorCode || extraction.errorCode || textDecision?.aiErrorCode,
    localRiskLevel,
    flags: textDecision
      ? {
          ...textDecision.flags,
          aiFlagged: baseDecision.flags.aiFlagged || textDecision.flags.aiFlagged,
        }
      : baseDecision.flags,
    metadata: mergeMetadata(baseDecision.metadata, {
      imageTextExtractionAttempted: envFlag("IMAGE_TEXT_EXTRACTION_ENABLED", true),
      imageTextExtractionAvailable: true,
      imageTextExtractionSucceeded: true,
      extractedTextPreview: summarizePreview(extraction.extractedText),
      extractedTextLength: extraction.extractedText.length,
      detectedUrls: extraction.urls.slice(0, 6),
      detectedDomains: textSignals.hostnames.slice(0, 6),
      detectedGamblingTerms: textSignals.matchedTerms.gambling.slice(0, 10),
      detectedPromotionTerms: textSignals.matchedTerms.promotion.slice(0, 10),
      detectedContactTerms: [...textSignals.matchedTerms.contacts, ...extraction.contactHints].slice(0, 10),
      qrAttempted: qrDetectionEnabled,
      qrSucceeded: qrDetectionEnabled ? extraction.qrUrls.length > 0 : false,
      qrUrls: qrDetectionEnabled ? extraction.qrUrls.slice(0, 6) : [],
      qrDestinations: qrDetectionEnabled ? extraction.qrUrls.slice(0, 6) : [],
      contactHints: extraction.contactHints.slice(0, 6),
      qrDetected: qrDetectionEnabled ? extraction.qrUrls.length > 0 : false,
      qrBlockedDomain: qrHasBlockedDomain,
      imageTextModerationStatus: textDecision?.status || "approved",
      moderationAttempted: true,
      providerStatus: extraction.diagnostic?.providerStatus || baseDecision.metadata?.providerStatus || "ready",
      errorCategory: extraction.diagnostic?.category || baseDecision.metadata?.errorCategory || null,
      retryable: extraction.diagnostic?.retryable || false,
      attempts: Math.max(
        Number(baseDecision.metadata?.attempts || 0),
        Number(extraction.diagnostic?.attempts || 1),
      ),
      lastRequestId: extraction.diagnostic?.requestId || baseDecision.metadata?.lastRequestId || null,
      diagnosticAction: extraction.diagnostic?.recommendedAction || baseDecision.metadata?.diagnosticAction || "none",
    }),
  }
}

export async function moderateCommunityStory(input: {
  caption?: string
  imageUrl?: string
  imageDataUrl?: string
}): Promise<ModerationDecision> {
  const captionDecision = await moderateCommunityText({
    content: input.caption || "",
    urls: input.imageUrl ? [input.imageUrl] : [],
  })
  const imageDecision = input.imageUrl || input.imageDataUrl ? await moderateCommunityImage({ imageUrl: input.imageUrl, dataUrl: input.imageDataUrl }) : null

  const status = combineDecisionStatuses(captionDecision.status, imageDecision?.status || "approved")
  const reasons = mergeReasons(
    captionDecision.reasons.map((reason) => `story:${reason.replace(/[:/]/g, "-")}`),
    imageDecision && imageDecision.status !== "approved" ? ["story:unsafe-media"] : [],
    imageDecision?.reasons || [],
  )
  const scores = mergeScores(captionDecision.scores, imageDecision?.scores)
  const localRiskLevel: LocalRiskLevel =
    status === "rejected" ? "severe" : status === "pending_review" ? "risky" : "safe"

  return {
    status,
    reasons,
    scores,
    provider: imageDecision ? "combined" : captionDecision.provider,
    aiAvailable: captionDecision.aiAvailable || Boolean(imageDecision?.aiAvailable),
    aiErrorCode: captionDecision.aiErrorCode || imageDecision?.aiErrorCode,
    localRiskLevel,
    flags: {
      profanity: captionDecision.flags.profanity || Boolean(imageDecision?.flags.profanity),
      harassment: captionDecision.flags.harassment || Boolean(imageDecision?.flags.harassment),
      threat: captionDecision.flags.threat || Boolean(imageDecision?.flags.threat),
      gambling: captionDecision.flags.gambling || Boolean(imageDecision?.flags.gambling),
      blockedDomain: captionDecision.flags.blockedDomain || Boolean(imageDecision?.flags.blockedDomain),
      promotion: captionDecision.flags.promotion || Boolean(imageDecision?.flags.promotion),
      evasiveText: captionDecision.flags.evasiveText || Boolean(imageDecision?.flags.evasiveText),
      aiFlagged: captionDecision.flags.aiFlagged || Boolean(imageDecision?.flags.aiFlagged),
    },
    metadata: mergeMetadata(
      {
        captionStatus: captionDecision.status,
        captionReasons: captionDecision.reasons,
      },
      imageDecision
        ? {
            imageStatus: imageDecision.status,
            imageReasons: imageDecision.reasons,
            imageMetadata: imageDecision.metadata || {},
          }
        : undefined,
    ),
  }
}

export async function createModerationLog(input: {
  userId?: string | null
  contentType: ModerationContentType
  contentId?: string | null
  status: ModerationStatus
  action: string
  reasons?: string[]
  scores?: Record<string, number>
  provider?: ModerationProvider
  reviewedBy?: string | null
  metadata?: Record<string, unknown>
}) {
  await ModerationLog.create({
    user: input.userId || null,
    contentType: input.contentType,
    contentId: input.contentId || randomUUID(),
    status: input.status,
    action: input.action,
    reasons: (input.reasons || []).slice(0, 20),
    scores: input.scores || {},
    provider: input.provider || "local",
    reviewedBy: input.reviewedBy || null,
    metadata: input.metadata || {},
  })
}

export function getPublicationStatusForModeration(status: ModerationStatus) {
  return status === "approved" ? "published" : "hidden"
}

export function isApprovedModeration(status?: string | null) {
  return !status || status === "approved"
}

export async function assertCommunityPostingAllowed(userId: string) {
  const user = await User.findById(userId).select("moderationState")
  if (!user) throw new Error("Authentication required")

  const state = user.moderationState || {}
  if (state.bannedAt) {
    throw new Error("Your account is banned from community posting")
  }
  if (state.suspendedAt) {
    throw new Error("Your account is suspended from community posting")
  }
  if (state.postingRestrictedUntil && new Date(state.postingRestrictedUntil).getTime() > Date.now()) {
    throw new Error("Your account is temporarily restricted from community posting")
  }
}

export async function applyUserModerationAction(input: {
  userId: string
  action: "warn" | "restrict" | "suspend" | "ban"
}) {
  const update: Record<string, unknown> = {
    "moderationState.lastActionAt": new Date(),
  }

  if (input.action === "warn") {
    update.$inc = { "moderationState.warningsCount": 1 }
  }

  if (input.action === "restrict") {
    update["moderationState.postingRestrictedUntil"] = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }

  if (input.action === "suspend") {
    update["moderationState.suspendedAt"] = new Date()
  }

  if (input.action === "ban") {
    update["moderationState.bannedAt"] = new Date()
  }

  await User.updateOne({ _id: input.userId }, update)
}

export async function notifyUserModerationAction(input: {
  recipientId: string
  action: "warn" | "restrict" | "suspend" | "ban"
  referenceType?: string
  referenceId?: string
}) {
  const typeMap = {
    warn: "community_user_warned",
    restrict: "community_user_restricted",
    suspend: "community_user_suspended",
    ban: "community_user_banned",
  } as const

  return createCommunityNotification({
    recipientId: input.recipientId,
    type: typeMap[input.action],
    referenceType: input.referenceType || "account",
    message: input.referenceId || "",
    dedupeKey: `${typeMap[input.action]}:${input.recipientId}:${input.referenceType || "account"}:${input.referenceId || "account"}`,
  })
}

export async function notifyContentModerationOutcome(input: {
  recipientId: string
  outcome: "pending_review" | "approved" | "rejected" | "hidden"
  contentType: "post" | "story" | "image" | "video"
  contentId: string
}) {
  const typeMap = {
    pending_review: "community_content_pending",
    approved: "community_content_approved",
    rejected: "community_content_rejected",
    hidden: "community_content_hidden",
  } as const

  const payload = {
    recipientId: input.recipientId,
    type: typeMap[input.outcome],
    referenceType: input.contentType,
    dedupeKey: `${typeMap[input.outcome]}:${input.contentType}:${input.contentId}:${input.recipientId}`,
  } as const

  if (input.contentType === "post") {
    return createCommunityNotification({ ...payload, postId: input.contentId })
  }
  if (input.contentType === "story") {
    return createCommunityNotification({ ...payload, storyId: input.contentId })
  }
  return createCommunityNotification({ ...payload, mediaId: input.contentId })
}

export async function registerModerationStrike(input: {
  userId: string
  contentType: ModerationContentType
  contentId: string
  reasons?: string[]
  reviewedBy?: string | null
}) {
  const threshold = Math.max(1, Number(process.env.COMMUNITY_MODERATION_STRIKE_THRESHOLD || "3"))
  const windowDays = Math.max(1, Number(process.env.COMMUNITY_MODERATION_STRIKE_WINDOW_DAYS || "30"))
  const milestoneValues = String(process.env.COMMUNITY_MODERATION_STRIKE_MILESTONES || "3,5,10")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)

  const strikeKey = `${input.userId}:${input.contentType}:${input.contentId}`
  const existingStrike = await ModerationLog.findOne({
    user: input.userId,
    action: "strike_recorded",
    "metadata.strikeKey": strikeKey,
  }).select("_id")
  if (existingStrike) return { strikeRecorded: false, totalStrikes: 0, milestoneReached: null as number | null }

  await createModerationLog({
    userId: input.userId,
    contentType: input.contentType,
    contentId: input.contentId,
    status: "rejected",
    action: "strike_recorded",
    reasons: input.reasons || [],
    provider: "manual",
    reviewedBy: input.reviewedBy || null,
    metadata: { strikeKey },
  })

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const totalStrikes = await ModerationLog.countDocuments({
    user: input.userId,
    action: "strike_recorded",
    createdAt: { $gte: since },
  })

  const milestoneReached = milestoneValues
    .filter((value) => totalStrikes >= value)
    .sort((a, b) => b - a)[0] || null

  if (
    milestoneReached &&
    String(process.env.COMMUNITY_NOTIFY_MODERATION_STRIKES || "true").trim().toLowerCase() !== "false"
  ) {
    await createCommunityNotification({
      recipientId: input.userId,
      type: "community_moderation_strike_alert",
      referenceType: "moderation",
      message: `${milestoneReached}`,
      dedupeKey: `moderation-strike:${input.userId}:${milestoneReached}:${since.toISOString().slice(0, 10)}`,
    })
  }

  return { strikeRecorded: true, totalStrikes, milestoneReached: milestoneReached || (totalStrikes >= threshold ? threshold : null) }
}
