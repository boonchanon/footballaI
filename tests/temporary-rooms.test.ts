import test from "node:test"
import assert from "node:assert/strict"

import {
  buildApprovedRoomActivityFilter,
  buildRoomMessageMetadata,
  canPostToRoom,
  canReadRoom,
  getRoomState,
  getTemporaryRoomActivityState,
  getVisibleMatchRoomChannels,
  shouldArchiveRoom,
} from "../lib/server/community-room-conversation"
import { normalizeMatchRoomFixture } from "../lib/server/community-match-room"

function fixture(overrides: Record<string, unknown> = {}) {
  return normalizeMatchRoomFixture({
    fixture: {
      id: "match-1",
      status: { short: "NS" },
      date: "2026-08-01T12:00:00Z",
    },
    teams: { home: { name: "Arsenal" }, away: { name: "Chelsea" } },
    goals: {},
    ...overrides,
  })
}

function finishedFixture(overrides: Record<string, unknown> = {}) {
  return fixture({
    fixture: {
      id: "match-1",
      status: { short: "FT" },
      date: "2026-08-01T12:00:00Z",
      finishedAt: "2026-08-01T13:50:00Z",
    },
    goals: { home: 2, away: 1 },
    ...overrides,
  })
}

test("preview room opens 60 minutes before kickoff, closes at kickoff and archives after retention", () => {
  const match = fixture()
  assert.equal(getRoomState(match, "preview", new Date("2026-08-01T10:59:59Z")).state, "upcoming")
  assert.equal(getRoomState(match, "preview", new Date("2026-08-01T11:00:00Z")).state, "open")
  assert.equal(getRoomState(match, "preview", new Date("2026-08-01T11:59:00Z")).state, "closing")
  const closed = getRoomState(match, "preview", new Date("2026-08-01T12:00:00Z"))
  assert.equal(closed.state, "closed")
  assert.equal(closed.canRead, true)
  assert.equal(closed.canPost, false)
  assert.equal(getRoomState(match, "preview", new Date("2026-08-15T12:00:00Z")).state, "archived")
})

test("preview room closes immediately when provider status is live or finished", () => {
  const liveMatch = fixture({ fixture: { id: "match-1", status: { short: "1H" }, date: "2026-08-01T12:00:00Z" } })
  const finishedMatch = fixture({ fixture: { id: "match-1", status: { short: "FT" }, date: "2026-08-01T12:00:00Z" }, goals: { home: 1, away: 1 } })
  assert.equal(getRoomState(liveMatch, "preview", new Date("2026-08-01T11:15:00Z")).state, "closed")
  assert.equal(getRoomState(finishedMatch, "preview", new Date("2026-08-01T11:15:00Z")).state, "closed")
  assert.equal(canPostToRoom(liveMatch, "preview", new Date("2026-08-01T11:15:00Z")), false)
})

test("postponed and cancelled temporary rooms never open for normal users", () => {
  const postponed = fixture({ fixture: { id: "match-1", status: { short: "PST" }, date: "2026-08-01T12:00:00Z" } })
  const cancelled = fixture({ fixture: { id: "match-1", status: { short: "CANC" }, date: "2026-08-01T12:00:00Z" } })
  assert.equal(canPostToRoom(postponed, "preview", new Date("2026-08-01T11:30:00Z")), false)
  assert.equal(canPostToRoom(cancelled, "post_match", new Date("2026-08-01T13:30:00Z")), false)
})

test("post-match room uses trusted finishedAt when present", () => {
  const match = finishedFixture()
  const beforeFinished = getRoomState(match, "post_match", new Date("2026-08-01T13:49:00Z"))
  const open = getRoomState(match, "post_match", new Date("2026-08-01T13:50:00Z"))
  const stillOpen = getRoomState(match, "post_match", new Date("2026-08-01T14:49:00Z"))
  const closed = getRoomState(match, "post_match", new Date("2026-08-01T14:51:00Z"))
  const archived = getRoomState(match, "post_match", new Date("2026-08-15T14:50:00Z"))
  assert.equal(beforeFinished.state, "unavailable")
  assert.equal(open.state, "open")
  assert.equal(stillOpen.state, "closing")
  assert.equal(closed.state, "closed")
  assert.equal(closed.canPost, false)
  assert.equal(archived.state, "archived")
  assert.equal(archived.canPost, false)
})

test("post-match room opens as soon as provider marks the match finished when finishedAt is missing", () => {
  const match = fixture({ fixture: { id: "match-1", status: { short: "FT" }, date: "2026-08-01T12:00:00Z" }, goals: { home: 2, away: 2 } })
  const notFinished = fixture()
  assert.equal(getRoomState(notFinished, "post_match", new Date("2026-08-01T13:46:00Z")).state, "unavailable")
  assert.equal(getRoomState(match, "post_match", new Date("2026-08-01T12:30:00Z")).state, "open")
  const fallback = getRoomState(match, "post_match", new Date("2026-08-01T13:46:00Z"))
  assert.equal(fallback.state, "open")
  assert.equal(fallback.opensAt?.toISOString(), "2026-08-01T13:45:00.000Z")
})

test("server-side room state ignores client injected timing fields", () => {
  const match = fixture()
  const clientInjected = { ...match, closesAt: "2099-01-01T00:00:00Z", remainingSeconds: 999999 }
  assert.equal(getRoomState(clientInjected, "preview", new Date("2026-08-01T12:01:00Z")).state, "closed")
  assert.equal(canPostToRoom(clientInjected, "preview", new Date("2026-08-01T12:01:00Z")), false)
})

test("archived temporary rooms are hidden from normal navigation but visible to admins", () => {
  const match = fixture()
  const archivedAt = new Date("2026-08-15T12:01:00Z")
  const closedChannels = getVisibleMatchRoomChannels(match, new Date("2026-08-01T12:01:00Z"), "user")
  const userChannels = getVisibleMatchRoomChannels(match, archivedAt, "user")
  const adminChannels = getVisibleMatchRoomChannels(match, archivedAt, "admincommunity")
  assert.equal(closedChannels.some((channel) => channel.roomType === "preview" && channel.state === "closed"), true)
  assert.equal(userChannels.some((channel) => channel.roomType === "preview"), false)
  assert.equal(adminChannels.some((channel) => channel.roomType === "preview" && channel.isArchived), true)
  assert.equal(canReadRoom(match, "preview", archivedAt, "admincommunity"), true)
})

test("temporary room activity distinguishes open and closing windows", () => {
  const match = fixture()
  assert.equal(getTemporaryRoomActivityState(match, "preview", new Date("2026-08-01T11:15:00Z")), "preview_open")
  assert.equal(getTemporaryRoomActivityState(match, "preview", new Date("2026-08-01T11:55:00Z")), "preview_closing")
  assert.equal(getTemporaryRoomActivityState(finishedFixture(), "post_match", new Date("2026-08-01T14:45:00Z")), "post_match_closing")
})

test("approved room activity count excludes pending and archived messages", () => {
  const filter = buildApprovedRoomActivityFilter() as any
  assert.equal(filter.isRoomMessage, true)
  assert.equal(filter.contentType, "room_message")
  assert.equal(filter.archivedAt, null)
  assert.equal(filter.status, "published")
  assert.deepEqual(filter.$or.at(-1), { "moderation.status": "approved" })
})

test("room metadata keeps retention metadata without hard delete", () => {
  const room = getRoomState(finishedFixture(), "post_match", new Date("2026-08-01T13:55:00Z"))
  const metadata = buildRoomMessageMetadata({
    matchId: "match-1",
    roomType: "post_match",
    roomClosedAt: room.closesAt,
    roomExpiresAt: room.expiresAt,
  })
  assert.equal(metadata.archivedAt, null)
  assert.equal(metadata.roomClosedAt?.toISOString(), "2026-08-01T14:50:00.000Z")
  assert.equal(metadata.roomExpiresAt?.toISOString(), "2026-08-15T14:50:00.000Z")
  assert.equal(shouldArchiveRoom(finishedFixture(), "post_match", new Date("2026-08-01T14:51:00Z")), false)
  assert.equal(shouldArchiveRoom(finishedFixture(), "post_match", new Date("2026-08-15T14:50:00Z")), true)
})
