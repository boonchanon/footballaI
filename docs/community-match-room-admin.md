# Community Match Room Admin

Phase C.5 adds Admin Community management for Match Rooms without creating new auth, role, permission, moderation, report, match, post, poll, comment, or notification systems.

## Roles

The existing admin roles are:

- `superadmin`: full admin access.
- `admin`: football/admin access, but not Community management.
- `admincommunity`: Community and Match Room management.

Admin Match Room access is limited to `superadmin` and `admincommunity` through existing `requireAdminRoles` and `canManageCommunityAdmin` policy.

## Routes

UI:

- `/admin/community/match-rooms`
- `/admin/community/match-rooms/[matchId]`

API:

- `GET /api/admin/community/match-rooms`
- `GET /api/admin/community/match-rooms/[matchId]`
- `PATCH /api/admin/community/match-rooms/[matchId]`

The sidebar link is under the existing Admin Community section.

## Read-Only Match Facts

The admin Match Room pages display match facts, but do not allow editing:

- score
- match status
- kickoff
- team/player data
- venue
- league
- match events/statistics

## List View

The list view uses server-side filtering and pagination. It shows:

- teams and match ID
- match status and kickoff
- room states for `main`, `tactics`, `preview`, and `post_match`
- message, thread, poll, report, archive, and follower counts where available
- latest activity

Supported filters include active, archived, reports, preview open, post-match open, and text search.

## Detail View

Tabs:

- overview
- main
- tactics
- preview
- post_match
- threads
- polls
- reports
- moderation
- audit

Archived temporary rooms are visible to Admin Community and Super Admin. User-facing Match Room APIs continue to hide archived content from normal users.

## Actions

Supported actions reuse `CommunityPost` and moderation state:

- hide/unhide room messages
- hide/unhide threads
- pin/unpin threads
- official/unofficial threads
- hide/unhide polls
- manually close or archive preview/post-match room

Manual close/archive requires a reason and only applies to temporary rooms. It does not hard delete messages, reports, moderation logs, or media.

## Reports And Moderation

Reports use the existing `CommunityReport` model and targets:

- `room_message`
- `thread_root`
- `match_poll`
- `comment`
- `reply`

Moderation and audit tabs reuse `ModerationLog`. Existing moderation queue links remain available from the admin Match Room detail page.

## Audit Log

Admin actions are logged through `ModerationLog` with:

- action
- actor role from the admin session
- reviewedBy admin ID
- matchId
- roomType
- targetType
- targetId
- previous/new status
- reason

Client input cannot set actor ID, actor role, match facts, vote totals, or arbitrary moderation status.

## Security

Every admin API request checks:

- admin authentication
- `superadmin` or `admincommunity`
- match existence
- target belongs to match
- action allowlist
- temporary room type for manual close/archive
- reason length where required

The ordinary `admin` role cannot access these routes unless the existing role policy changes.

## Performance

The APIs use pagination, projections through selected queries, and aggregation by indexed fields already present around:

- `matchId`
- `roomType`
- `contentType`
- `status`
- `archivedAt`
- `latestActivityAt`
- report target fields
- moderation log content fields

No destructive migration or duplicate index is added.

## Known Limitations

- Manual room-level close/archive is represented through existing message metadata plus `ModerationLog`; no separate room model is introduced.
- Unarchive/restart is intentionally not implemented.
- Poll vote totals and user votes are read-only from this admin surface.
