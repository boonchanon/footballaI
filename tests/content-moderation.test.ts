import test from "node:test"
import assert from "node:assert/strict"
import {
  __resetAIModerationTestAdapters,
  __resetOpenAIProviderCircuitBreakerForTests,
  __setAIModerationTestAdapters,
  classifyOpenAIProviderError,
  runOpenAIProviderRetry,
} from "../lib/server/ai-moderation"
import { moderateCommunityImage, moderateCommunityStory, moderateCommunityText, normalizeText } from "../lib/server/content-moderation"

process.env.CONTENT_MODERATION_ENABLED = "true"
process.env.AI_MODERATION_ENABLED = "false"
process.env.IMAGE_MODERATION_ENABLED = "false"
process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "false"

test.afterEach(() => {
  __resetAIModerationTestAdapters()
  __resetOpenAIProviderCircuitBreakerForTests()
  process.env.AI_MODERATION_ENABLED = "false"
  process.env.IMAGE_MODERATION_ENABLED = "false"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "false"
})

test("OpenAI classifier ควรแยก invalid_api_key จาก 401", () => {
  const result = classifyOpenAIProviderError({
    status: 401,
    code: "invalid_api_key",
    type: "invalid_api_key_error",
    requestID: "req_invalid",
    message: "Incorrect API key provided: sk-secret",
  })

  assert.equal(result.category, "invalid_api_key")
  assert.equal(result.httpStatus, 401)
  assert.equal(result.requestId, "req_invalid")
  assert.match(result.message, /\[redacted-api-key\]/)
})

test("OpenAI classifier ควรแยก insufficient_quota จาก 429", () => {
  const result = classifyOpenAIProviderError({
    status: 429,
    code: "insufficient_quota",
    type: "insufficient_quota",
    requestID: "req_quota",
    message: "You exceeded your current quota.",
  })

  assert.equal(result.category, "insufficient_quota")
  assert.equal(result.retryable, false)
})

test("rate_limited ควร retry จนสำเร็จ และเคารพ Retry-After", async () => {
  let calls = 0
  const delays: number[] = []
  const result = await runOpenAIProviderRetry({
    operation: "image_safety",
    model: "mock-model",
    maxRetries: 2,
    bypassCircuitBreaker: true,
    wait: async (delay) => {
      delays.push(delay)
    },
    execute: async () => {
      calls += 1
      if (calls < 3) throw { status: 429, code: "rate_limit_exceeded", message: "Too many requests", headers: { "retry-after": "2" } }
      return "safe"
    },
  })

  assert.equal(calls, 3)
  assert.equal("value" in result && result.value, "safe")
  assert.deepEqual(delays, [2000, 2000])
})

test("insufficient_quota ไม่ควร retry และเปิด circuit breaker", async () => {
  let calls = 0
  const first = await runOpenAIProviderRetry({
    operation: "image_safety",
    model: "mock-model",
    maxRetries: 2,
    execute: async () => {
      calls += 1
      throw { status: 429, code: "insufficient_quota", message: "You exceeded your current quota" }
    },
  })
  const second = await runOpenAIProviderRetry({
    operation: "image_safety",
    model: "mock-model",
    maxRetries: 2,
    execute: async () => {
      calls += 1
      return "should not run"
    },
  })

  assert.equal(calls, 1)
  assert.equal("error" in first && first.error.category, "insufficient_quota")
  assert.equal("error" in second && second.error.category, "provider_unavailable")
})

test("server error และ timeout ควร retry แต่ invalid key ไม่ retry", async () => {
  let serverCalls = 0
  const serverResult = await runOpenAIProviderRetry({
    operation: "vision",
    model: "mock-model",
    maxRetries: 2,
    bypassCircuitBreaker: true,
    wait: async () => undefined,
    execute: async () => {
      serverCalls += 1
      if (serverCalls === 1) throw { status: 500, code: "server_error", message: "Internal server error" }
      return "ok"
    },
  })
  let invalidCalls = 0
  const invalidResult = await runOpenAIProviderRetry({
    operation: "vision",
    model: "mock-model",
    maxRetries: 2,
    bypassCircuitBreaker: true,
    execute: async () => {
      invalidCalls += 1
      throw { status: 401, code: "invalid_api_key", message: "Incorrect API key" }
    },
  })

  assert.equal(serverCalls, 2)
  assert.equal("value" in serverResult && serverResult.value, "ok")
  assert.equal(invalidCalls, 1)
  assert.equal("error" in invalidResult && invalidResult.error.retryable, false)
})

test("OpenAI classifier ควรแยก model_not_found จาก 404", () => {
  const result = classifyOpenAIProviderError({
    status: 404,
    code: "model_not_found",
    requestID: "req_model",
    message: "The model `missing-model` does not exist",
  })

  assert.equal(result.category, "model_not_found")
  assert.equal(result.httpStatus, 404)
})

test("OpenAI classifier ควรแยก dns_error จาก cause", () => {
  const result = classifyOpenAIProviderError({
    name: "APIConnectionError",
    message: "fetch failed",
    cause: {
      code: "ENOTFOUND",
    },
  })

  assert.equal(result.category, "dns_error")
  assert.equal(result.retryable, true)
})

test("OpenAI classifier ควรแยก timeout จาก cause", () => {
  const result = classifyOpenAIProviderError({
    name: "APIConnectionTimeoutError",
    message: "Request timed out after 60000ms",
    cause: {
      code: "ETIMEDOUT",
    },
  })

  assert.equal(result.category, "timeout")
  assert.equal(result.retryable, true)
})

test("OpenAI classifier ควรแยก connection error เป็น network_error", () => {
  const result = classifyOpenAIProviderError({
    name: "Error",
    message: "Connection error.",
  })

  assert.equal(result.category, "network_error")
})

test("Image safety invalid key mock ควรเข้า pending review และไม่ถือเป็น safe", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: false,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "error",
      errorCode: "invalid_api_key",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,aW52YWxpZC1rZXk=" })
  assert.equal(result.status, "pending_review")
  assert.equal(result.aiErrorCode, "invalid_api_key")
  assert.equal(result.metadata?.imageSafetyErrorCode, "invalid_api_key")
})

test("Vision model not found mock ควรเข้า pending review", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: false,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "error",
      errorCode: "model_not_found",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,bW9kZWwtbm90LWZvdW5k" })
  assert.equal(result.status, "pending_review")
  assert.equal(result.metadata?.imageTextExtractionErrorCode, "model_not_found")
})

test("ฟุตบอลวิเคราะห์ปกติควรผ่านอัตโนมัติ", async () => {
  const result = await moderateCommunityText({
    title: "วิเคราะห์กลางปืน",
    content: "อาร์เซนอลวันนี้เพรสแดนกลางดีมาก และการเชื่อมเกมจากแดนหลังทำได้ดี",
  })

  assert.equal(result.status, "approved")
  assert.equal(result.localRiskLevel, "safe")
})

test("ข่าวเตือนภัยพนันไม่ควรถูก reject อัตโนมัติ", async () => {
  const result = await moderateCommunityText({
    content: "ตำรวจจับเว็บพนันรายใหญ่และเตือนภัยไม่ให้กดลิงก์สมัครเว็บเหล่านี้",
  })

  assert.notEqual(result.status, "rejected")
  assert.ok(result.reasons.includes("text:gambling"))
})

test("ลิงก์ข่าวทั่วไปไม่ควรโดนสแปมทันที", async () => {
  const result = await moderateCommunityText({
    content: "อ่านข่าวต่อได้ที่ https://www.bbc.com/sport/football",
  })

  assert.equal(result.status, "approved")
})

test("ภาษาก้ำกึ่งควรเข้า pending review", async () => {
  const result = await moderateCommunityText({
    content: "มึงคิดว่าเกมนี้ควรเปลี่ยนแผนตรงไหน",
  })

  assert.equal(result.status, "pending_review")
  assert.equal(result.localRiskLevel, "risky")
})

test("คำคุกคามรุนแรงควรถูก reject", async () => {
  const result = await moderateCommunityText({
    content: "มึงตายไปซะ ไอ้เหี้ย",
  })

  assert.equal(result.status, "rejected")
  assert.equal(result.localRiskLevel, "severe")
})

test("โปรโมตพนันพร้อมช่องทางติดต่อควรถูก reject", async () => {
  const result = await moderateCommunityText({
    content: "แทงบอลเว็บตรง สมัครรับโปร โบนัส แอดไลน์ @แทงบอลด่วน",
  })

  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("text:gambling-promotion"))
})

test("โดเมนพนันต้องถูก reject", async () => {
  const result = await moderateCommunityText({
    content: "ดูรายละเอียดได้ที่ ufabet.com ตอนนี้เลย",
  })

  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("url:blocked-gambling-domain"))
})

test("โดเมนคล้ายกันแต่ไม่ใช่โดเมนต้องห้ามไม่ควรถูก reject ทันที", async () => {
  const result = await moderateCommunityText({
    content: "บทวิเคราะห์เว็บไซต์ ufabet-news.com สำหรับข่าวฟุตบอล",
  })

  assert.notEqual(result.status, "rejected")
})

test("ข้อความมีตัวเลขทั่วไปไม่ควรโดนมองเป็นเบอร์ติดต่อเสมอ", async () => {
  const result = await moderateCommunityText({
    content: "คาดว่าสกอร์ 3-1 และครองบอล 62 เปอร์เซ็นต์",
  })

  assert.equal(result.status, "approved")
})

test("normalizeText ต้องลบ zero-width ออก", () => {
  assert.equal(normalizeText("อาร์\u200Bเซนอล"), "อาร์เซนอล")
})

test("รูปฟุตบอลปกติควร approved และไม่เข้า OCR violation", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "Arsenal pre-season training",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,Zm9vdGJhbGw=" })
  assert.equal(result.status, "approved")
  assert.equal(result.reasons.length, 0)
})

test("ภาพ sexual ระดับรุนแรงควรถูก reject", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: true,
      categories: { "sexual/minors": true },
      scores: { "sexual/minors": 0.99 },
      reasons: ["ai:sexual/minors"],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: false,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "disabled",
      provider: "local",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,c2V2ZXJl" })
  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("image:sexual-minors"))
})

test("ภาพส่อทางเพศระดับกลางควรเข้า pending review", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: true,
      categories: { sexual: true },
      scores: { sexual: 0.77 },
      reasons: ["ai:sexual"],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,cmFjeQ==" })
  assert.equal(result.status, "pending_review")
  assert.ok(result.reasons.includes("image:sexual-content"))
})

test("OCR พบข้อความพนันพร้อมช่องทางติดต่อควรถูก reject", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "แทงบอล เว็บตรง เครดิตฟรี ฝาก 10 รับ 100",
      urls: [],
      qrUrls: [],
      contactHints: ["line id: abc123"],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,Z2FtYmxpbmc=" })
  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("image:gambling-promotion"))
  assert.ok(result.reasons.includes("image:contact-spam"))
})

test("OCR บริบทข่าวเตือนภัยพนันไม่ควรถูก reject อัตโนมัติ", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "ตำรวจจับเว็บพนันรายใหญ่ เตือนภัยไม่ให้กดลิงก์สมัคร",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,d2FybmluZw==" })
  assert.notEqual(result.status, "rejected")
})

test("OCR พบโดเมนพนันต้องถูก reject", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "สมัครผ่านเว็บ ufabet.com ได้เลย",
      urls: ["https://ufabet.com"],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,ZG9tYWlu" })
  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("image:blocked-domain"))
})

test("โดเมนคล้ายแต่ไม่ใช่ของจริงไม่ควรถูก reject ทันที", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "วิเคราะห์ข่าวจาก ufabet.com.example.org",
      urls: ["https://ufabet.com.example.org"],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,bWltaWM=" })
  assert.notEqual(result.status, "rejected")
})

test("QR เว็บพนันควรถูก reject", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: ["https://bet365.com/register"],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,cXI=" })
  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("image:qr-gambling-link"))
})

test("QR ทั่วไปไม่มีคำพนันไม่ควรถูก reject อัตโนมัติ", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: ["https://www.arsenal.com/tickets"],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,cXIy" })
  assert.notEqual(result.status, "rejected")
})

test("OCR ใช้งานไม่ได้แต่ภาพปลอดภัยไม่ควรถูก reject", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "error",
      provider: "openai",
      errorMessage: "ocr failed",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,b2NyLWVycm9y" })
  assert.equal(result.status, "pending_review")
  assert.ok(result.reasons.includes("image:image-text-extraction-unavailable"))
})

test("Image safety ใช้งานไม่ได้แต่ OCR ปลอดภัยควร pending review", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: false,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "error",
      provider: "openai",
      errorMessage: "image safety timeout",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "Arsenal open training day",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,c2FmZS1mYWxsYmFjaw==" })
  assert.equal(result.status, "pending_review")
  assert.ok(result.reasons.includes("image:image-safety-unavailable"))
})

test("Image safety ใช้งานไม่ได้แต่ OCR พบพนันชัดเจนควรถูก reject", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: false,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "error",
      provider: "openai",
      errorMessage: "image safety timeout",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "แทงบอล เว็บตรง เครดิตฟรี",
      urls: [],
      qrUrls: [],
      contactHints: ["line: @betabc"],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,Z2FtYmxlLWZhbGxiYWNr" })
  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("image:gambling-promotion"))
})

test("OCR provider disabled ควรเข้า pending review", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "false"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,b2NyLWRpc2FibGVk" })
  assert.equal(result.status, "pending_review")
  assert.ok(result.reasons.includes("image:image-text-extraction-unavailable"))
})

test("OCR สำเร็จจริงและข้อความว่าง + image safety safe ควร approved", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,bm8tdGV4dA==" })
  assert.equal(result.status, "approved")
})

test("ข้อความพนันแบบเว้นวรรคต้องยังถูกตรวจเจอ", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "ส มั ค ร รับ โ บ นั ส แอด ไลน์ @abc แทงบอล เว็บ ตรง ฟรี เครดิต",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,c3BhY2VkLWdhbWJsaW5n" })
  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("image:gambling-promotion"))
})

test("ufa bet . com ต้องยังตรวจเจอเป็น blocked domain", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "เข้าเว็บ ufa bet . com รับโบนัส",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityImage({ dataUrl: "data:image/png;base64,c3BhY2VkLWRvbWFpbg==" })
  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("image:blocked-domain"))
})

test("Story ปลอดภัยทั้ง caption และ image ควร approved", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "North London forever",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityStory({
    caption: "บรรยากาศก่อนแข่งคืนนี้",
    imageUrl: "https://example.com/arsenal-safe.jpg",
  })
  assert.equal(result.status, "approved")
})

test("Story caption ปลอดภัยแต่ image พนันควรถูก reject", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "สมัครแทงบอล รับเครดิตฟรี",
      urls: [],
      qrUrls: [],
      contactHints: ["telegram: @betnow"],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityStory({
    caption: "ไฮไลต์คืนนี้",
    imageUrl: "https://example.com/story.jpg",
  })
  assert.equal(result.status, "rejected")
  assert.ok(result.reasons.includes("story:unsafe-media"))
})

test("Story caption เสี่ยงแต่ภาพปกติควร pending review", async () => {
  process.env.AI_MODERATION_ENABLED = "true"
  process.env.IMAGE_MODERATION_ENABLED = "true"
  process.env.IMAGE_TEXT_EXTRACTION_ENABLED = "true"
  __setAIModerationTestAdapters({
    moderateImageWithAI: async () => ({
      available: true,
      flagged: false,
      categories: {},
      scores: {},
      reasons: [],
      rawStatus: "ok",
    }),
    extractImageTextWithAI: async () => ({
      available: true,
      extractedText: "",
      urls: [],
      qrUrls: [],
      contactHints: [],
      rawStatus: "ok",
      provider: "openai",
    }),
  })

  const result = await moderateCommunityStory({
    caption: "มึงคิดว่าแมตช์นี้จะจบยังไง",
    imageUrl: "https://example.com/story-safe.jpg",
  })
  assert.equal(result.status, "pending_review")
})
