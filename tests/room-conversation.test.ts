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
  getTemporaryRoomActivityState,
  normalizeMatchRoomContentType,
  normalizeMatchRoomType,
  shouldArchiveRoom,
} from "../lib/server/community-room-conversation"
import { normalizeMatchRoomFixture } from "../lib/server/community-match-room"
import {
  getActiveMatchDemoOverridePhase,
  getEffectiveMatchTimelinePhase,
  getMatchDemoOverrideNotice,
  getMatchDemoRoomAvailabilityPhase,
  getTimedEffectiveMatchTimelinePhase,
  isMatchDemoOverrideEnabled,
  normalizeMatchDemoOverrideDurationMinutes,
  normalizeMatchDemoOverridePhase,
} from "../lib/match-demo-override"
import { buildTeamPreviewLoungeTag, buildTeamReactionLoungeTag } from "../lib/match-preview-lounges"
import { MAIN_ROOM_COPY, getMainRoomDateDividerLabel, getRoomMessageBubbleLayout, getSystemMessageLayout, mergeMainRoomMessages, shouldGroupMainRoomMessage, shouldShowMainRoomDateDivider } from "../lib/match-main-room-ui"
import {
  TACTICAL_QUICK_TOPICS,
  TACTICAL_ROOM_COPY,
  buildTacticalTopicTag,
  extractTacticalTopicFromTags,
  getTacticalFixtureContext,
  getTacticalPhaseFocus,
  getTacticalQuickTopicLabel,
  normalizeTacticalQuickTopic,
} from "../lib/match-tactical-room-ui"
import { COMMUNITY_THREAD_CATEGORY_LABELS } from "../lib/server/community-threads"

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

test("match demo override should normalize allowlisted phases and leave auto on provider phase", () => {
  assert.equal(normalizeMatchDemoOverridePhase("auto"), "auto")
  assert.equal(normalizeMatchDemoOverridePhase("Full_Time"), "full_time")
  assert.equal(normalizeMatchDemoOverridePhase("change-score"), null)
  assert.equal(isMatchDemoOverrideEnabled("live"), true)
  assert.equal(isMatchDemoOverrideEnabled("auto"), false)
  assert.equal(getEffectiveMatchTimelinePhase("pre_match", "auto"), "pre_match")
  assert.equal(getEffectiveMatchTimelinePhase("pre_match", "full_time"), "full_time")
  assert.equal(getMatchDemoRoomAvailabilityPhase({ enabled: false, effectivePhase: "full_time" }), "auto")
  assert.equal(getMatchDemoRoomAvailabilityPhase({ enabled: true, effectivePhase: "pre_match" }), "pre_match")
  assert.equal(getMatchDemoOverrideNotice("full_time"), "กำลังจำลองประสบการณ์หลังจบเกม")
})

test("timed match demo override should use override only until server expiresAt", () => {
  const now = new Date("2026-08-20T00:00:00Z")
  const activeExpiresAt = new Date("2026-08-20T00:05:00Z")
  const expiredAt = new Date("2026-08-19T23:59:59Z")

  assert.equal(getTimedEffectiveMatchTimelinePhase("pre_match", "auto", null, now), "pre_match")
  assert.equal(getTimedEffectiveMatchTimelinePhase("pre_match", "live", activeExpiresAt, now), "live")
  assert.equal(getTimedEffectiveMatchTimelinePhase("pre_match", "live", expiredAt, now), "pre_match")
  assert.equal(getActiveMatchDemoOverridePhase("full_time", activeExpiresAt, now), "full_time")
  assert.equal(getActiveMatchDemoOverridePhase("full_time", expiredAt, now), "auto")
})

test("timed demo override refresh should not reset expiry and provider updates should win after expiry", () => {
  const startsAt = new Date("2026-08-20T00:00:00Z")
  const expiresAt = new Date(startsAt.getTime() + 5 * 60 * 1000)
  const afterRefresh = new Date("2026-08-20T00:02:00Z")
  const afterExpiry = new Date("2026-08-20T00:05:01Z")

  assert.equal(Math.ceil((expiresAt.getTime() - afterRefresh.getTime()) / 1000), 180)
  assert.equal(getTimedEffectiveMatchTimelinePhase("pre_match", "live", expiresAt, afterRefresh), "live")
  assert.equal(getTimedEffectiveMatchTimelinePhase("live", "pre_match", expiresAt, afterRefresh), "pre_match")
  assert.equal(getTimedEffectiveMatchTimelinePhase("live", "pre_match", expiresAt, afterExpiry), "live")
  assert.equal(getTimedEffectiveMatchTimelinePhase("full_time", "live", expiresAt, afterExpiry), "full_time")
})

test("timed demo override durations should support presets and reject invalid custom values", () => {
  assert.equal(normalizeMatchDemoOverrideDurationMinutes(5), 5)
  assert.equal(normalizeMatchDemoOverrideDurationMinutes("10"), 10)
  assert.equal(normalizeMatchDemoOverrideDurationMinutes("30"), 30)
  assert.equal(normalizeMatchDemoOverrideDurationMinutes("1"), 1)
  assert.equal(normalizeMatchDemoOverrideDurationMinutes("120"), 120)
  assert.equal(normalizeMatchDemoOverrideDurationMinutes("0"), null)
  assert.equal(normalizeMatchDemoOverrideDurationMinutes("121"), null)
  assert.equal(normalizeMatchDemoOverrideDurationMinutes("demo"), null)
})

test("timed pre-match demo override should count down from override expiry instead of kickoff", () => {
  const match = fixture({
    fixture: { id: "match-1", status: { short: "NS" }, date: "2026-08-22T00:00:00Z" },
  })
  const now = new Date("2026-08-20T00:00:00Z")
  const demoExpiresAt = new Date("2026-08-20T00:05:00Z")
  const previewRoom = getRoomState(match, "preview", now, "pre_match", { demoOverrideExpiresAt: demoExpiresAt })

  assert.equal(previewRoom.state, "open")
  assert.equal(previewRoom.remainingSeconds, 300)
  assert.equal(previewRoom.closesAt?.toISOString(), demoExpiresAt.toISOString())
  assert.equal(canPostToRoom(match, "preview", now, "pre_match", { demoOverrideExpiresAt: demoExpiresAt }), true)
})

test("timed full-time demo override should count down post-match lounge from override expiry", () => {
  const match = fixture({
    fixture: { id: "match-1", status: { short: "NS" }, date: "2026-08-22T00:00:00Z" },
  })
  const now = new Date("2026-08-20T00:00:00Z")
  const demoExpiresAt = new Date("2026-08-20T00:10:00Z")
  const reactionRoom = getRoomState(match, "post_match", now, "full_time", { demoOverrideExpiresAt: demoExpiresAt })

  assert.equal(reactionRoom.state, "open")
  assert.equal(reactionRoom.remainingSeconds, 600)
  assert.equal(reactionRoom.closesAt?.toISOString(), demoExpiresAt.toISOString())
  assert.equal(getTemporaryRoomActivityState(match, "post_match", now, "full_time", { demoOverrideExpiresAt: demoExpiresAt }), "post_match_open")
})

test("auto room availability should keep provider lifecycle while demo phases use effective phase", () => {
  const finished = fixture({
    fixture: { id: "match-1", status: { short: "FT" }, date: "2026-07-31T12:00:00Z" },
    goals: { home: 2, away: 1 },
  })
  const now = new Date("2026-07-31T14:46:00Z")
  const autoPhase = getMatchDemoRoomAvailabilityPhase({ enabled: false, effectivePhase: "full_time" })
  const preMatchPhase = getMatchDemoRoomAvailabilityPhase({ enabled: true, effectivePhase: "pre_match" })
  const livePhase = getMatchDemoRoomAvailabilityPhase({ enabled: true, effectivePhase: "live" })
  const fullTimePhase = getMatchDemoRoomAvailabilityPhase({ enabled: true, effectivePhase: "full_time" })

  assert.equal(getRoomState(finished, "post_match", now, autoPhase).state, "archived")
  assert.equal(getRoomState(finished, "preview", now, preMatchPhase).canPost, true)
  assert.equal(getRoomState(finished, "post_match", now, preMatchPhase).canPost, false)
  assert.equal(getRoomState(finished, "main", now, livePhase).canPost, true)
  assert.equal(getRoomState(finished, "tactics", now, livePhase).canPost, true)
  assert.equal(getRoomState(finished, "preview", now, livePhase).canPost, false)
  assert.equal(getRoomState(finished, "post_match", now, fullTimePhase).canPost, true)
  assert.equal(getRoomState(finished, "preview", now, fullTimePhase).canPost, false)
})

test("pre-match demo override should open preview lounges without opening reactions", () => {
  const match = fixture({ fixture: { id: "match-1", status: { short: "FT" }, date: "2026-07-31T12:00:00Z" } })
  const now = new Date("2026-07-31T14:30:00Z")
  assert.equal(getRoomState(match, "main", now, "pre_match").state, "open")
  assert.equal(getRoomState(match, "preview", now, "pre_match").state, "open")
  assert.equal(canPostToRoom(match, "preview", now, "pre_match"), true)
  assert.equal(getRoomState(match, "post_match", now, "pre_match").state, "unavailable")
  assert.equal(canPostToRoom(match, "post_match", now, "pre_match"), false)
})

test("live demo override should prioritize main and tactics while closing temporary rooms", () => {
  const match = fixture()
  const now = new Date("2026-07-31T11:30:00Z")
  assert.equal(getRoomState(match, "main", now, "live").state, "open")
  assert.equal(getRoomState(match, "tactics", now, "live").state, "open")
  assert.equal(getRoomState(match, "main", now, "live").isArchived, false)
  assert.equal(getRoomState(match, "tactics", now, "full_time").isArchived, false)
  assert.equal(getRoomState(match, "preview", now, "live").state, "closed")
  assert.equal(getRoomState(match, "post_match", now, "live").state, "unavailable")
  assert.equal(canPostToRoom(match, "preview", now, "live"), false)
})

test("full-time demo override should open reaction lounges and keep preview closed", () => {
  const match = fixture()
  const now = new Date("2026-07-31T11:30:00Z")
  assert.equal(getRoomState(match, "main", now, "full_time").state, "open")
  assert.equal(getRoomState(match, "post_match", now, "full_time").state, "open")
  assert.equal(getTemporaryRoomActivityState(match, "post_match", now, "full_time"), "post_match_open")
  assert.equal(getRoomState(match, "preview", now, "full_time").state, "closed")
  assert.equal(canPostToRoom(match, "preview", now, "full_time"), false)
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

test("tactical room identity and quick topics should stay centralized", () => {
  assert.equal(TACTICAL_ROOM_COPY.title, "Tactical Room")
  assert.match(TACTICAL_ROOM_COPY.description, /แผนการเล่น/)
  assert.equal(TACTICAL_ROOM_COPY.missingProviderData, "ยังไม่มีข้อมูลแผนการเล่นจากผู้ให้บริการ")
  assert.deepEqual(TACTICAL_QUICK_TOPICS.map((topic) => topic.id), [
    "formation",
    "pressing",
    "build_up",
    "counter_attack",
    "substitution",
    "manager",
    "player",
    "defence",
    "attack",
  ])
})

test("tactical quick topic validation and normalization should reject client injected values", () => {
  assert.equal(normalizeTacticalQuickTopic("Formation"), "formation")
  assert.equal(normalizeTacticalQuickTopic("Build-up"), "build_up")
  assert.equal(normalizeTacticalQuickTopic("counter attack"), "counter_attack")
  assert.equal(normalizeTacticalQuickTopic("client-injected"), null)
  assert.equal(buildTacticalTopicTag("pressing"), "match-tactical:pressing")
  assert.equal(buildTacticalTopicTag("bad-topic"), "")
  assert.equal(extractTacticalTopicFromTags(["match-tactical:manager"]), "manager")
  assert.equal(extractTacticalTopicFromTags(["match-preview:home"]), null)
  assert.equal(getTacticalQuickTopicLabel("defence"), "Defence")
})

test("tactical context should render formation data only when provider supplies it", () => {
  const withProviderData = getTacticalFixtureContext({
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    lineups: [
      { team: { name: "Arsenal" }, formation: "4-3-3", coach: { name: "Mikel Arteta" } },
      { teamName: "Chelsea", formation: "4-2-3-1", manager: "Enzo Maresca" },
    ],
    events: [],
  })
  assert.equal(withProviderData.hasProviderData, true)
  assert.equal(withProviderData.lineups[0].formation, "4-3-3")
  assert.equal(withProviderData.lineups[0].manager, "Mikel Arteta")

  const missing = getTacticalFixtureContext({ homeTeam: "Arsenal", awayTeam: "Chelsea", events: [] })
  assert.equal(missing.hasProviderData, false)
  assert.deepEqual(missing.lineups, [])
})

test("tactical context should prioritize substitutions, cards, and formation changes from real events", () => {
  const context = getTacticalFixtureContext({
    events: [
      { type: "Goal", minute: 10, player: "Saka" },
      { type: "Substitution", minute: 60, player: "Martinelli", team: "Arsenal" },
      { detail: "Red Card", minute: 72, player: "Caicedo", team: "Chelsea" },
      { type: "Formation Change", minute: 75, detail: "Formation Change" },
    ],
  })
  assert.equal(context.substitutions.length, 1)
  assert.equal(context.cards.length, 1)
  assert.equal(context.formationChanges.length, 1)
  assert.deepEqual(getTacticalPhaseFocus("pre_match"), ["Formation", "Lineup"])
  assert.deepEqual(getTacticalPhaseFocus("live"), ["Substitution", "แท็กติก"])
  assert.deepEqual(getTacticalPhaseFocus("full_time"), ["Analysis Threads", "AI Overall Summary"])
})

test("tactical messages should stay isolated by room type and optional topic tag", () => {
  const tactical = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "tactics" }), tags: [buildTacticalTopicTag("formation")] }
  const main = buildRoomMessageMetadata({ matchId: "match-1", roomType: "main" })
  const preview = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "preview" }), tags: [buildTeamPreviewLoungeTag("home")] }
  const reaction = { ...buildRoomMessageMetadata({ matchId: "match-1", roomType: "post_match" }), tags: [buildTeamReactionLoungeTag("home")] }

  assert.equal(tactical.roomType, "tactics")
  assert.notEqual(tactical.roomType, main.roomType)
  assert.notEqual(tactical.roomType, preview.roomType)
  assert.notEqual(tactical.roomType, reaction.roomType)
  assert.equal(extractTacticalTopicFromTags(tactical.tags), "formation")
  assert.equal(publishedVisible(tactical), false)
})

test("tactical threads should reuse existing thread category", () => {
  assert.equal(COMMUNITY_THREAD_CATEGORY_LABELS.tactics, "แท็กติก")
  assert.equal(getTacticalQuickTopicLabel("player"), "Player")
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
