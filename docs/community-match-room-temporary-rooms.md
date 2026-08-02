# Community Match Room Temporary Rooms

Phase C adds lifecycle enforcement for temporary Match Room channels without adding WebSocket, new auth, new moderation, new notification, or new data models.

## Time Source

- Kickoff time comes from the football fixture provider as an ISO timestamp and is handled by the server as UTC.
- Thai display remains a UI concern through the existing `dateThai`/browser locale formatting.
- Match status comes from the football service fixture refresh.
- `finishedAt` is used when the provider supplies `finishedAt`, `endedAt`, or `fullTimeAt`.
- If `finishedAt` is missing, the server fallback is kickoff + 105 minutes, and only after that time has passed.
- Browser countdown values are display-only and are never accepted by create/edit APIs.

## Preview Room

- `preview` opens 60 minutes before kickoff.
- It archives at kickoff or immediately when provider status becomes live/finished.
- Postponed/cancelled matches do not open temporary rooms.
- Normal users can post only while state is `open` or `closing`.
- Archived preview rooms are hidden from normal navigation after refresh.
- Admin/moderator users can still read archive routes through existing community admin permission checks.

## Post-Match Room

- `post_match` opens when match status is finished and a trusted `finishedAt` can be resolved.
- It closes and archives 60 minutes after `finishedAt`.
- When `finishedAt` is missing, the server uses the safe fallback policy above.
- Closed/archived post-match rooms tell users to continue in the main or tactics room.

## Server Enforcement

All room message create/edit requests validate:

- match existence
- normalized `roomType`
- server-side room state at request time
- `canPost`

If the server has already closed the room, the API returns `403` with `details.code = "ROOM_CLOSED"` and `moveTargetRoom = "main"`. The client refreshes state and keeps the draft.

## Countdown

- Server sends `opensAt`, `closesAt`, `archiveAt`, `expiresAt`, and `remainingSeconds`.
- Client countdown is display-only.
- When the display reaches zero, the client refreshes Match Room/message APIs and trusts the server response.
- SWR focus revalidation handles inactive tabs when users return.

## Archive

- Temporary room state becomes `archived` at `archiveAt`.
- Normal user navigation filters archived temporary rooms out.
- Normal users cannot load archived temporary room messages.
- Admin/moderator users can read archived room messages.
- Reports, moderation logs, and media references are preserved.
- Request handlers never hard delete room data.

## Activity

- The server reports temporary room activity states:
  - `preview_open`
  - `preview_closing`
  - `post_match_open`
  - `post_match_closing`
- Message counts use only approved, visible room messages.
- Pending-review messages do not increase public activity counts.
- No notification is sent for every message.

## Draft Handling

When a room closes while a user is typing or submitting:

- The client restores the draft.
- A dialog offers to move the draft to the main room, copy the text, or cancel.
- Moving the draft only changes rooms and keeps the draft; it does not auto-post.

## Cleanup And Retention

`npm run cleanup:temporary-match-rooms` is dry-run by default.

It reports:

- closed temporary messages that can be marked archived
- expired temporary messages past retention
- active reports attached to expired messages

Use `npm run cleanup:temporary-match-rooms -- --apply` to set archive metadata on closed temporary room messages. The script does not hard delete messages, reports, moderation evidence, or media.

## Known Limitations

- There is no scheduler in the current app. Cleanup must be run manually or by a future scheduled job.
- Provider fixtures currently do not consistently include `finishedAt`; fallback policy is documented and tested.
- Notification links to archived temporary rooms resolve to unavailable state for normal users; a richer admin archive UI can be expanded later from the moderation screen.
