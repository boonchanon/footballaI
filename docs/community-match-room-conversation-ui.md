# Community Match Room Conversation UI

Phase B changes the Match Room discussion tab from post-card browsing into room-based asynchronous conversation. It keeps the existing Match Room routes, Poll, AI Summary, Threads, moderation, and Phase A feed isolation.

## Layout

- Desktop uses three columns: room sidebar, conversation, and info panel.
- Mobile uses horizontal room tabs, full-width conversation, and an info sheet.
- Match Hero, Poll tab, AI Summary tab, Thread tab, and existing routes remain intact.

## Room Navigation

- Active room is persisted in the URL with `?tab=discussion&room=...`.
- Supported room values are `main`, `tactics`, `preview`, and `post-match`.
- Browser refresh/back/forward preserve the selected room through the query string.
- Only the active room message endpoint is fetched.

## Message UI

- Messages render as continuous conversation rows, not post cards.
- Rows show avatar, display name, timestamp, edited badge, pending badge for owners, content, media thumbnail, and reply reference.
- Consecutive messages from the same author are visually grouped.
- Message actions live in a compact dropdown.

## Composer

- Composer is sticky at the bottom of the conversation.
- It automatically attaches `matchId` and active `roomType`.
- It supports text, one image attachment, reply context, Enter to send, and Shift+Enter for newline.
- Closed rooms disable sending and show a shortcut back to the main room.

## Reply

- Reply is one level only.
- Reply preview appears above the composer and can be cancelled.
- Reply references render above the message.
- If the parent message is not loaded or unavailable, the UI shows `ข้อความต้นทางไม่พร้อมใช้งาน`.

## Actions

- Owner can reply, edit, delete, and copy link.
- Other users can reply, report, and copy link.
- Admin/moderator can delete/hide and open the message in moderation.
- Server-side permission remains enforced by the room message API.

## Pagination And Refresh

- Initial load fetches the latest room messages.
- `โหลดข้อความเก่า` fetches older pages and prepends without duplicating existing messages.
- The active room polls every 20 seconds.
- Polling is paused while the tab is hidden by SWR `refreshWhenHidden: false`.
- If the user is not near the bottom, new messages show an indicator instead of forcing auto-scroll.

## Accessibility

- Room navigation uses semantic `nav`/`tablist` labels.
- Message list uses `aria-live` and loading state.
- Composer and actions expose screen-reader labels.
- Keyboard focus uses visible focus rings.
- Mobile uses safe-area padding for the sticky composer.

## Known Limitations

- No WebSocket, Socket.IO, presence, voice, or room membership is introduced.
- Temporary room countdown UI and archive cleanup worker are intentionally not part of Phase B.
- Deleted parent placeholder is shown when the parent is not loaded or no longer visible.
- This phase keeps Poll and AI Summary UI mostly unchanged except for the info panel links.
