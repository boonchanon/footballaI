# Community Admin Operations

## Scope

Admin Community manages community safety and operations by reusing existing models and flows:

- `User`
- `CommunityPost`
- `Comment`
- `CommunityReport`
- `CommunityStory`
- `CommunityMedia`
- `ModerationLog`
- `CommunityNotification`
- existing Match Room Admin
- existing Moderation Queue
- existing Reports

It does not create a new auth, moderation, notification, poll, thread, room, or user system.

## Roles

Server-side community admin write access is limited to:

- `superadmin`
- `admincommunity`

The source of truth is `lib/admin-access.ts` and admin APIs use `requireAdminRoles(request, ["superadmin", "admincommunity"])`.

## User States

User community moderation state lives on `User.moderationState`.

- `warningsCount`: warning counter, preserved across unban.
- `postingRestrictedUntil`: content creation restriction until a server-calculated date.
- `suspendedAt`: blocks community interactions while set.
- `bannedAt`: community ban until admin unbans.
- `lastActionAt`: last moderation action timestamp.

## Warn

Warn increments `warningsCount`, writes `ModerationLog`, and sends `community_user_warned`.

## Restrict

Restriction blocks content creation flows. The client sends only an allowlisted duration key:

- `1h`
- `24h`
- `3d`
- `7d`

The server calculates `postingRestrictedUntil`. The client is not trusted to send a final timestamp.

## Clear Restriction

Clear restriction sets `postingRestrictedUntil` to `null`, preserves warnings and other states, writes `ModerationLog`, and sends `community_user_restriction_cleared`.

## Suspend

Suspension sets `suspendedAt` and blocks community interactions while set. The current schema has no suspension expiry field, so unsuspend is manual.

## Unsuspend

Unsuspend clears `suspendedAt`, preserves warnings/restriction/ban, writes `ModerationLog`, and sends `community_user_unsuspended`.

## Ban

Ban is a Community Ban, not account deletion and not login ban.

Banned users can:

- login
- read Community
- read profiles
- read Match Hub
- read Threads
- submit reports under duplicate/rate policies

Banned users cannot:

- create/edit/delete post
- repost
- comment/reply
- create/edit/delete thread
- send/edit/delete Match Room message
- create story
- upload community media
- create poll
- vote poll
- like
- follow Match Room
- perform friend/community social actions

## Unban

Unban clears `bannedAt` only. It does not reset `warningsCount`, delete history, clear suspension, or clear restriction. After unban, the user can act according to remaining states.

## Report Flow

Reports reuse `CommunityReport`.

Admin can:

- dismiss report
- resolve report
- hide content
- warn/restrict/suspend/ban target author when resolvable

Every resolve/dismiss requires a reason and writes `ModerationLog`.

## Moderation Flow

Moderation queue uses existing `CommunityPost`, `Comment`, `CommunityStory`, and `CommunityMedia` moderation state. The UI exposes backend-supported types:

- post
- comment
- story
- image
- video
- room_message
- thread_root
- match_poll

Actions reuse the existing approve/reject/hide route plus user moderation action support.

## Content Management

Content management reads existing data:

- Posts: `CommunityPost` with `contentType: community_post`
- Threads: `CommunityPost` with `contentType: thread_root`
- Polls: `CommunityPost.poll` with `contentType: match_poll`
- Stories: `CommunityStory`

No Poll or Thread model is created.

## Match Room Admin

Match Room Admin remains in place and is linked from Admin Community navigation. It keeps:

- list
- detail
- room states
- archive actions
- demo override
- poll/thread actions
- audit tab

## Audit Log

Global audit reads `ModerationLog`. No audit model is created. It supports filtering by action, target type, matchId, target user, actor/date where available.

## Ban Enforcement

Server-side enforcement is centralized in `lib/server/content-moderation.ts`.

Key helpers:

- `assertCommunityInteractionAllowed`
- `assertCommunityPostingAllowed`
- `getCommunityInteractionDenial`

UI disable is not treated as security.

## Banned Words

The moderation engine currently uses static server-side lists:

- `PROFANITY_TERMS`
- `HARASSMENT_PATTERNS`
- `THREAT_PATTERNS`
- `GAMBLING_TERMS`
- `GAMBLING_PROMOTION_PATTERNS`
- `BLOCKED_GAMBLING_DOMAINS`

There is no database-backed moderation configuration yet, so the admin page is read-only and does not show fake CRUD controls.

## Settings

Community Settings displays only policies backed by server logic. Mock toggles and fake save buttons were removed.

## Limitations

- No persisted banned-word configuration yet.
- No suspension expiry field exists.
- No standalone Admin Notification center exists.
- Report author resolution is strongest for post/comment/room-message targets already tied to existing content records.
- Global user creation remains out of this sprint; the old mock add-user form was disabled.
