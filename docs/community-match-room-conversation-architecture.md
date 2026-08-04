# Community Match Room Conversation Architecture

Phase A separates official Match Room conversation data from the normal Community feed without changing the existing Match Room UI, routes, threads, polls, or AI summary flows.

## Room Types

- `main`: permanent official match room for general match discussion.
- `tactics`: permanent official match room for tactics and analysis discussion.
- `preview`: temporary pre-match room. It opens before kickoff and closes at kickoff.
- `post_match`: temporary post-match room. It opens after the match is finished and closes after the configured review window.

The timing helper lives in `lib/server/community-room-conversation.ts`.

## Room State

`getRoomState(match, roomType, now)` returns:

- `unavailable`: match or timing data is not enough to open the room.
- `upcoming`: temporary room has not opened yet.
- `open`: users can read and post.
- `closing`: users can read and post, but the temporary room is close to closing.
- `closed`: users can read historical room content, but normal users cannot post.
- `archived`: temporary room is outside the retention window and hidden from normal users.

Admin and moderator access still uses `canManageCommunityAdmin`.

## Data Model

`CommunityPost` is reused for compatibility, with extra metadata:

- `roomType`: `main`, `tactics`, `preview`, or `post_match`.
- `contentType`: `community_post`, `room_message`, `thread_root`, `match_poll`, `official_match_update`, or `match_summary_preview`.
- `isRoomMessage`: true only for room chat-style messages.
- `replyToPost`: optional one-level reply reference for room messages.
- `roomClosedAt`, `roomExpiresAt`, `archivedAt`: lifecycle metadata for temporary rooms.

Existing Community posts default to `community_post`, so old feed data stays compatible.

## Feed Isolation

The public Community feed and My Posts exclude:

- `isRoomMessage: true`
- legacy `isThreadRoot: true`
- `contentType` in `room_message`, `thread_root`, or `match_poll`

This keeps official room conversations, thread roots, and match polls from polluting the normal feed.

## API Contract

- `GET /api/community/match-room` continues to return existing match room data and now includes channel states plus approved room activity indicators.
- `GET /api/community/match-room/messages?matchId=&roomType=` lists room messages visible to the viewer.
- `POST /api/community/match-room/messages` creates a room message and reuses existing text/media moderation.
- `PATCH /api/community/match-room/messages/[messageId]` edits a room message if the user owns it or can manage community admin.
- `DELETE /api/community/match-room/messages/[messageId]` soft-hides a room message.
- `POST /api/community/match-room/messages/[messageId]/report` reports a room message through the existing report model.

Admin moderation keeps using the existing moderation queue actions, with `room_message`, `thread_root`, and `match_poll` available as content types.

## Compatibility Notes

- No WebSocket or real-time chat system is introduced in Phase A.
- No Discord/Telegram style UI is introduced in Phase A.
- Poll, Thread, AI Summary, notification, and Match Room routes are kept compatible.
- Temporary room archiving is represented by metadata and helpers; a scheduled cleanup/archive worker can be added later if needed.
