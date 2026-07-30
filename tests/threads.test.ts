import test from "node:test"
import assert from "node:assert/strict"

import {
  buildThreadDbSort,
  buildThreadDuplicateKey,
  buildThreadActionPermissions,
  computeThreadPopularityScore,
  isAiSafeThreadSource,
  mapAiSafeThreadSource,
  normalizeCommunityThreadCategory,
  normalizeCommunityThreadSort,
} from "../lib/server/community-threads"

test("thread category and sort normalization should fallback safely", () => {
  assert.equal(normalizeCommunityThreadCategory("tactics"), "tactics")
  assert.equal(normalizeCommunityThreadCategory("unknown"), null)
  assert.equal(normalizeCommunityThreadSort("popular"), "popular")
  assert.equal(normalizeCommunityThreadSort("broken"), "latest")
})

test("thread db sort should prioritize latest activity and official pin states", () => {
  assert.deepEqual(buildThreadDbSort("latest"), { isPinned: -1, latestActivityAt: -1, createdAt: -1 })
  assert.deepEqual(buildThreadDbSort("official"), { isPinned: -1, isOfficialThread: -1, latestActivityAt: -1, createdAt: -1 })
})

test("thread duplicate key and popularity score should stay deterministic", () => {
  const keyA = buildThreadDuplicateKey({
    matchId: "match-1",
    title: "  Arsenal ชนะไหม  ",
    content: "คุยเรื่องเกมนี้กัน",
    category: "general",
  })
  const keyB = buildThreadDuplicateKey({
    matchId: "match-1",
    title: "arsenal ชนะไหม",
    content: "คุยเรื่องเกมนี้กัน",
    category: "general",
  })

  assert.equal(keyA, keyB)

  const hotScore = computeThreadPopularityScore({
    likes: 8,
    comments: 5,
    createdAt: new Date().toISOString(),
    latestActivityAt: new Date().toISOString(),
  })
  const coldScore = computeThreadPopularityScore({
    likes: 1,
    comments: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    latestActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  })

  assert.equal(hotScore > coldScore, true)
})

test("thread action permissions should separate owner, moderator, and reporter actions", () => {
  const owner = buildThreadActionPermissions({ viewerId: "u1", authorId: "u1" })
  assert.equal(owner.canEdit, true)
  assert.equal(owner.canDelete, true)
  assert.equal(owner.canReport, false)
  assert.equal(owner.canPin, false)

  const moderator = buildThreadActionPermissions({ viewerId: "mod", authorId: "u1", canModerate: true })
  assert.equal(moderator.canEdit, true)
  assert.equal(moderator.canPin, true)
  assert.equal(moderator.canToggleOfficial, true)
  assert.equal(moderator.canReport, true)

  const deleted = buildThreadActionPermissions({ viewerId: "u2", authorId: "u1", isDeleted: true })
  assert.equal(deleted.canReport, false)
  assert.equal(deleted.canCopyLink, false)
})

test("AI safe thread source should only expose approved public projection", () => {
  assert.equal(isAiSafeThreadSource({ status: "published", moderation: { status: "approved" } }), true)
  assert.equal(isAiSafeThreadSource({ status: "published", moderation: { status: "pending_review" } }), false)
  assert.equal(isAiSafeThreadSource({ status: "hidden", moderation: { status: "approved" } }), false)
  assert.equal(isAiSafeThreadSource({ status: "published", moderation: { status: "approved" }, isDeleted: true }), false)

  const mapped = mapAiSafeThreadSource({
    id: "thread-1",
    title: "A".repeat(240),
    content: "B".repeat(1400),
    threadCategory: "tactics",
    commentsCount: 3,
    likesCount: 2,
  })
  assert.equal(mapped.title.length, 180)
  assert.equal(mapped.content.length, 1200)
  assert.equal(mapped.threadCategory, "tactics")
  assert.equal(mapped.commentsCount, 3)
})
