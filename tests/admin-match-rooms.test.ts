import test from "node:test"
import assert from "node:assert/strict"

import {
  buildAdminPollFilter,
  buildAdminRoomMessageFilter,
  buildAdminThreadFilter,
  canAccessCommunityMatchRoomAdmin,
  isTemporaryMatchRoomType,
  normalizeAdminMatchRoomAction,
  normalizeAdminMatchRoomContentTab,
  normalizeAdminMatchRoomListFilter,
  requiresAdminActionReason,
  validateAdminActionReason,
} from "../lib/server/admin-community-match-rooms"

test("community match room admin access should use existing roles only", () => {
  assert.equal(canAccessCommunityMatchRoomAdmin("admincommunity"), true)
  assert.equal(canAccessCommunityMatchRoomAdmin("superadmin"), true)
  assert.equal(canAccessCommunityMatchRoomAdmin("admin"), false)
  assert.equal(canAccessCommunityMatchRoomAdmin("user"), false)
  assert.equal(canAccessCommunityMatchRoomAdmin("moderator"), false)
})

test("admin match room filters and tabs should normalize safely", () => {
  assert.equal(normalizeAdminMatchRoomListFilter("archived"), "archived")
  assert.equal(normalizeAdminMatchRoomListFilter("broken"), "all")
  assert.equal(normalizeAdminMatchRoomContentTab("reports"), "reports")
  assert.equal(normalizeAdminMatchRoomContentTab("bad-tab"), "overview")
})

test("admin actions should be allowlisted and reason-gated for manual archive", () => {
  assert.equal(normalizeAdminMatchRoomAction("message_hide"), "message_hide")
  assert.equal(normalizeAdminMatchRoomAction("change_score"), null)
  assert.equal(validateAdminActionReason("room_manual_archive", "too short").ok, true)
  assert.equal(validateAdminActionReason("room_manual_archive", "no").ok, false)
  assert.equal(validateAdminActionReason("message_hide", "").ok, true)
  assert.equal(requiresAdminActionReason("room_manual_archive"), true)
  assert.equal(requiresAdminActionReason("room_manual_close"), true)
  assert.equal(requiresAdminActionReason("message_hide"), false)
  assert.equal(requiresAdminActionReason("poll_hide"), false)
})

test("room filters should bind targets to match and content type", () => {
  assert.deepEqual(buildAdminRoomMessageFilter("m1", "preview"), {
    matchId: "m1",
    roomType: "preview",
    isRoomMessage: true,
    contentType: "room_message",
  })
  assert.equal(buildAdminRoomMessageFilter("m1", "bad-room"), null)
  assert.deepEqual(buildAdminThreadFilter("m1"), { matchId: "m1", isThreadRoot: true, contentType: "thread_root" })
  assert.deepEqual(buildAdminPollFilter("m1"), { matchId: "m1", contentType: "match_poll", "poll.question": { $ne: "" } })
})

test("temporary room admin actions should only target preview and post_match", () => {
  assert.equal(isTemporaryMatchRoomType("preview"), true)
  assert.equal(isTemporaryMatchRoomType("post_match"), true)
  assert.equal(isTemporaryMatchRoomType("main"), false)
  assert.equal(isTemporaryMatchRoomType("tactics"), false)
})
