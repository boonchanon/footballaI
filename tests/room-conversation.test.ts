import test from "node:test"
import assert from "node:assert/strict"

import {
  buildApprovedRoomActivityFilter,
  buildCommunityFeedIsolationFilter,
  buildRoomMessageMetadata,
  canPostToRoom,
  canReadRoom,
  getMatchRoomChannels,
  getRoomState,
  normalizeMatchRoomContentType,
  normalizeMatchRoomType,
  shouldArchiveRoom,
} from "../lib/server/community-room-conversation"
import { normalizeMatchRoomFixture } from "../lib/server/community-match-room"
import { buildTeamPreviewLoungeTag, buildTeamReactionLoungeTag } from "../lib/match-preview-lounges"
import { MAIN_ROOM_COPY, getMainRoomDateDividerLabel, getRoomMessageBubbleLayout, getSystemMessageLayout, mergeMainRoomMessages, shouldGroupMainRoomMessage, shouldShowMainRoomDateDivider } from "../lib/match-main-room-ui"

function fixture(overrides: Record<string, unknown> = {}) {
  return normalizeMatchRoomFixture({
    fixture: {
      id: "match-1",
      status: { short: "NS" },
      date: "2026-07-31T12:00:00Z",
    },
    teams: { home: { name: "Arsenal" }, away: { name: "Chelsea" } },
    goals: {},
    ...overrides,
  })
}

function publishedVisible(item: Record<string, unknown>) {
  const filter = buildCommunityFeedIsolationFilter() as any
  if (filter.isThreadRoot?.$ne === true && item.isThreadRoot === true) return false
  if (filter.isRoomMessage?.$ne === true && item.isRoomMessage === true) return false
  if (filter.contentType?.$nin?.includes(item.contentType)) return false
  return true
}

test("room metadata should separate community posts from room messages", () => {
  const metadata = buildRoomMessageMetadata({ matchId: "match-1", roomType: "main" })
  assert.equal(metadata.matchId, "match-1")
  assert.equal(metadata.roomType, "main")
  assert.equal(metadata.contentType, "room_message")
  assert.equal(metadata.isRoomMessage, true)
  assert.equal(normalizeMatchRoomContentType("thread_root"), "thread_root")
  assert.equal(normalizeMatchRoomContentType("client_injected_status"), "community_post")
})

test("room message validation helpers should require valid room type and match metadata", () => {
  assert.equal(normalizeMatchRoomType("main"), "main")
  assert.equal(normalizeMatchRoomType("tactics"), "tactics")
  assert.equal(normalizeMatchRoomType("bad-room"), null)
  assert.equal(Boolean(buildRoomMessageMetadata({ matchId: "match-1", roomType: "preview" }).matchId), true)
})

test("permanent room states should stay open for normal matches", () => {
  const match = fixture()
  assert.equal(getRoomState(match, "main", new Date("2026-07-31T09:00:00Z")).state, "open")
  assert.equal(getRoomState(match, "tactics", new Date("2026-07-31T09:00:00Z")).state, "open")
  assert.equal(canReadRoom(match, "main", new Date("2026-07-31T09:00:00Z")), true)
  assert.equal(canPostToRoom(match, "tactics", new Date("2026-07-31T09:00:00Z")), true)
})

test("preview room should move from upcoming to open and close when match starts", () => {
  const match = fixture()
  assert.equal(getRoomState(match, "preview", new Date("2026-07-31T10:30:00Z")).state, "upcoming")
  assert.equal(getRoomState(match, "preview", new Date("2026-07-31T11:10:00Z")).state, "open")
  assert.equal(getRoomState(match, "preview", new Date("2026-07-31T11:55:00Z")).state, "closing")
  assert.equal(getRoomState(match, "preview", new Date("2026-07-31T12:00:01Z")).state, "archived")
})

test("post-match room should open only after finished and close after configured window", () => {
  const match = fixture({
    fixture: { id: "match-1", status: { short: "FT" }, date: "2026-07-31T12:00:00Z" },
    goals: { home: 2, away: 1 },
  })
  assert.equal(getRoomState(match, "post_match", new Date("2026-07-31T11:00:00Z")).state, "unavailable")
  assert.equal(getRoomState(match, "post_match", new Date("2026-07-31T13:55:00Z")).state, "open")
  assert.equal(getRoomState(match, "post_match", new Date("2026-07-31T14:40:00Z")).state, "closing")
  assert.equal(getRoomState(match, "post_match", new Date("2026-07-31T14:46:00Z")).state, "archived")
})

test("postponed and cancelled matches should not open temporary rooms", () => {
  const postponed = fixture({ fixture: { id: "match-1", status: { short: "PST" }, date: "2026-07-31T12:00:00Z" } })
  const cancelled = fixture({ fixture: { id: "match-1", status: { short: "CANC" }, date: "2026-07-31T12:00:00Z" } })
  assert.equal(getRoomState(postponed, "preview", new Date("2026-07-31T11:30:00Z")).state, "closed")
  assert.equal(getRoomState(cancelled, "post_match", new Date("2026-07-31T12:30:00Z")).state, "closed")
})

test("temporary rooms should archive after retention window", () => {
  const match = fixture()
  assert.equal(shouldArchiveRoom(match, "preview", new Date("2026-08-20T12:00:00Z")), true)
})

test("channel helper should return all supported room types", () => {
  const channels = getMatchRoomChannels(fixture(), new Date("2026-07-31T11:30:00Z"))
  assert.deepEqual(channels.map((channel) => channel.roomType), ["main", "tactics", "preview", "post_match"])
})

test("feed isolation should exclude room messages, match polls, and thread roots", () => {
  assert.equal(publishedVisible({ contentType: "community_post", isRoomMessage: false }), true)
  assert.equal(publishedVisible({ contentType: "room_message", isRoomMessage: true }), false)
  assert.equal(publishedVisible({ contentType: "match_poll", isRoomMessage: false }), false)
  assert.equal(publishedVisible({ contentType: "thread_root", isRoomMessage: false }), false)
  assert.equal(publishedVisible({ contentType: "community_post", isThreadRoot: true }), false)
})

test("approved room activity filter should count only visible room messages", () => {
  const filter = buildApprovedRoomActivityFilter() as any
  assert.equal(filter.isRoomMessage, true)
  assert.equal(filter.contentType, "room_message")
  assert.equal(filter.archivedAt, null)
  assert.equal(filter.status, "published")
})

test("home and away preview lounge messages should remain isolated by existing room metadata", () => {
  const homePreview = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "preview" }), tags: [buildTeamPreviewLoungeTag("home")] }
  const awayPreview = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "preview" }), tags: [buildTeamPreviewLoungeTag("away")] }

  assert.equal(homePreview.roomType, "preview")
  assert.equal(awayPreview.roomType, "preview")
  assert.equal(homePreview.contentType, "room_message")
  assert.equal(homePreview.tags.includes(buildTeamPreviewLoungeTag("home")), true)
  assert.equal(homePreview.tags.includes(buildTeamPreviewLoungeTag("away")), false)
  assert.equal(awayPreview.tags.includes(buildTeamPreviewLoungeTag("away")), true)
  assert.equal(publishedVisible(homePreview), false)
  assert.equal(publishedVisible(awayPreview), false)
})

test("team reaction lounge lifecycle should open only after finished status and archive after the post-match window", () => {
  const notFinished = fixture({
    fixture: { id: "match-1", status: { short: "NS" }, date: "2026-07-31T12:00:00Z" },
  })
  const finished = fixture({
    fixture: { id: "match-1", status: { short: "FT" }, date: "2026-07-31T12:00:00Z" },
    goals: { home: 2, away: 1 },
  })

  assert.equal(getRoomState(notFinished, "post_match", new Date("2026-07-31T14:00:00Z")).state, "unavailable")
  assert.equal(canPostToRoom(notFinished, "post_match", new Date("2026-07-31T14:00:00Z")), false)
  assert.equal(getRoomState(finished, "post_match", new Date("2026-07-31T13:50:00Z")).state, "open")
  assert.equal(canPostToRoom(finished, "post_match", new Date("2026-07-31T13:50:00Z")), true)
  assert.equal(getRoomState(finished, "post_match", new Date("2026-07-31T14:40:00Z")).state, "closing")
  assert.equal(getRoomState(finished, "post_match", new Date("2026-07-31T14:46:00Z")).state, "archived")
})

test("team reaction lounge messages should remain isolated from feed, preview, main, and tactical rooms", () => {
  const homeReaction = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "post_match" }), tags: [buildTeamReactionLoungeTag("home")] }
  const awayReaction = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "post_match" }), tags: [buildTeamReactionLoungeTag("away")] }
  const preview = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "preview" }), tags: [buildTeamPreviewLoungeTag("home")] }

  assert.equal(homeReaction.roomType, "post_match")
  assert.equal(awayReaction.roomType, "post_match")
  assert.equal(homeReaction.tags.includes(buildTeamReactionLoungeTag("home")), true)
  assert.equal(homeReaction.tags.includes(buildTeamReactionLoungeTag("away")), false)
  assert.equal(awayReaction.tags.includes(buildTeamReactionLoungeTag("away")), true)
  assert.equal(homeReaction.roomType === preview.roomType, false)
  assert.equal(String(homeReaction.roomType) === "main", false)
  assert.equal(String(homeReaction.roomType) === "tactics", false)
  assert.equal(publishedVisible(homeReaction), false)
  assert.equal(publishedVisible(awayReaction), false)
})

test("main room copy, date divider, and deleted parent placeholder should stay centralized", () => {
  assert.equal(MAIN_ROOM_COPY.title, "Main Room")
  assert.equal(MAIN_ROOM_COPY.intro, "Everyone joins here.")
  assert.equal(MAIN_ROOM_COPY.description, "General discussion about this match.")
  assert.equal(MAIN_ROOM_COPY.deletedParent, "Original message is no longer available.")
  assert.equal(getMainRoomDateDividerLabel("2026-08-02T04:00:00Z", new Date("2026-08-02T10:00:00Z")), "Today")
  assert.equal(getMainRoomDateDividerLabel("2026-08-01T04:00:00Z", new Date("2026-08-02T10:00:00Z")), "Yesterday")
})

test("chat bubble layout should align own messages right and incoming messages left", () => {
  const own = getRoomMessageBubbleLayout({ isOwner: true })
  const incoming = getRoomMessageBubbleLayout({ isOwner: false })

  assert.equal(own.side, "right")
  assert.equal(own.showAvatar, false)
  assert.equal(own.showDisplayName, false)
  assert.match(own.rowClass, /justify-end/)
  assert.match(own.bubbleClass, /bg-primary/)

  assert.equal(incoming.side, "left")
  assert.equal(incoming.showAvatar, true)
  assert.equal(incoming.showDisplayName, true)
  assert.match(incoming.rowClass, /justify-start/)
  assert.match(incoming.bubbleClass, /bg-background/)
})

test("reply bubble and system layout should keep the correct side and center system rows", () => {
  const ownReply = getRoomMessageBubbleLayout({ isOwner: true, hasReply: true })
  const incomingReply = getRoomMessageBubbleLayout({ isOwner: false, hasReply: true })
  const groupedIncoming = getRoomMessageBubbleLayout({ isOwner: false, grouped: true })
  const systemEvent = getSystemMessageLayout("match_event")
  const dateDivider = getSystemMessageLayout("date_divider")

  assert.equal(ownReply.replySide, "right")
  assert.match(ownReply.replyClass, /primary-foreground/)
  assert.equal(incomingReply.replySide, "left")
  assert.match(incomingReply.replyClass, /bg-background/)
  assert.equal(groupedIncoming.showAvatar, false)
  assert.equal(groupedIncoming.showDisplayName, false)
  assert.equal(systemEvent.alignment, "center")
  assert.equal(dateDivider.alignment, "center")
})

test("main room grouping and date dividers should use stable createdAt ordering", () => {
  const first = { id: "a", author: { id: "u1" }, createdAt: "2026-08-01T10:55:00Z" }
  const second = { id: "b", author: { id: "u1" }, createdAt: "2026-08-01T10:56:00Z" }
  const nextDay = { id: "c", author: { id: "u1" }, createdAt: "2026-08-02T10:01:00Z" }
  assert.equal(shouldShowMainRoomDateDivider(first, null), true)
  assert.equal(shouldShowMainRoomDateDivider(second, first), false)
  assert.equal(shouldShowMainRoomDateDivider(nextDay, second), true)
  assert.equal(shouldGroupMainRoomMessage(second, first), true)
  assert.equal(shouldGroupMainRoomMessage(nextDay, second), false)
})

test("main room append should dedupe messages and preserve stable ordering", () => {
  const merged = mergeMainRoomMessages(
    [
      { id: "2", createdAt: "2026-08-02T10:02:00Z", content: "newer" },
      { id: "1", createdAt: "2026-08-02T10:01:00Z", content: "older" },
    ],
    [
      { id: "2", createdAt: "2026-08-02T10:02:00Z", content: "newer replacement" },
      { id: "3", createdAt: "2026-08-02T10:03:00Z", content: "latest" },
    ],
  )
  assert.deepEqual(merged.map((item) => item.id), ["1", "2", "3"])
  assert.equal(merged[1].content, "newer replacement")
})

test("main room isolation should remain separate from tactical, preview, reactions, and feed", () => {
  const main = buildRoomMessageMetadata({ matchId: "match-1", roomType: "main" })
  const tactical = buildRoomMessageMetadata({ matchId: "match-1", roomType: "tactics" })
  const preview = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "preview" }), tags: [buildTeamPreviewLoungeTag("home")] }
  const reaction = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "post_match" }), tags: [buildTeamReactionLoungeTag("home")] }
  assert.equal(main.roomType, "main")
  assert.notEqual(main.roomType, tactical.roomType)
  assert.notEqual(main.roomType, preview.roomType)
  assert.notEqual(main.roomType, reaction.roomType)
  assert.equal(publishedVisible(main), false)
})
