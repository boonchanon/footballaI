# Community Match Room Production Notes

## Follow Match Room

Match Room follow reuses the existing `User` document. It stores a bounded `followedMatchRooms` array with `matchId`, `followedAt`, `lastVisitedAt`, and `lastSeenActivityAt`.

- Follow and unfollow are idempotent.
- The client never sends `userId`; the API uses the authenticated session.
- Invalid or unknown `matchId` returns `404`.
- Guests receive `401` and should be sent to login by the UI.

## Following And Recent Rooms

`/api/community/match-room` returns `matchRoomState` and per-room `roomStats` metadata:

- `isFollowing`
- `isRecent`
- `isFavoriteTeam`
- `followers`
- `latestActivityAt`
- `latestPollAt`
- `summaryStatus`
- `activity`

Recent rooms reuse a bounded `recentMatchRooms` array on `User`. Entering a specific Match Room marks it visited. Directory loads do not create notifications.

Favorite team rooms are highlighted with a safe best-effort name match from `User.favoriteTeam` against fixture team names. This is only for directory UX. Favorite-team notification delivery should wait until fixtures expose canonical team IDs that match `favoriteTeamIds`.

## Activity Indicators

Indicators compare approved/visible activity only against `lastVisitedAt`.

- New activity uses the latest approved visible post/thread activity.
- New poll uses approved visible posts that contain a poll.
- AI Summary uses persisted summary state only.
- Pending, rejected, hidden, or deleted content is excluded by the existing visible-content filter.

## Notifications

Notification delivery reuses `CommunityNotification` and `dedupeKey`.

Supported Match Room notification types:

- `match_starting`
- `match_live`
- `match_finished`
- `official_poll_opened`
- `match_summary_ready`
- `community_match_room_posted`

Dedupe key formats:

- `match-starting:{matchId}:{recipientId}`
- `match-live:{matchId}:{recipientId}`
- `match-finished:{matchId}:{recipientId}`
- `official-poll:{matchId}:{pollId}:{recipientId}`
- `match-summary:{matchId}:{summaryVersion}:{recipientId}`
- `match-room-post:{postId}:{recipientId}`

Notifications are sent only by event paths or explicit helpers. They must not be created on page load.

Current recipient targeting is follower-based. Favorite-team based notifications are intentionally not enabled until the match data source exposes stable team IDs, because matching free-text team names for notifications can notify the wrong users.

## Preferences

Match Room notification preferences live under `User.notificationPreferences.matchRoom`.

Defaults:

- `matchStarting: true`
- `matchLive: true`
- `matchFinished: true`
- `officialPoll: true`
- `aiSummary: true`
- `threadActivity: true`

Moderation/account safety notifications are mandatory and are not controlled by these optional Match Room preferences.

## Scheduler Requirement

There is no long-running interval in the Next.js/serverless process. Production should trigger match status notifications from the existing match status update/sync path or an external scheduler.

Recommended production jobs:

- Upcoming match window: call the event helper once when a followed match is near kickoff.
- Status transition: call live/finished notifications when fixture status changes.
- Official poll opened: call once when the official poll entity is created.
- AI summary ready: current admin regenerate path already calls the summary notification helper once per summary version.

## Fan Profile

Fan Profile exposes only public-safe aggregates:

- Followed Match Room count
- Recent Match Room count
- Match Room posts count
- Poll votes count
- Badges

It does not expose moderation state, strikes, admin notes, private preferences, or notification settings.

## Indexes And Performance

The implementation avoids N+1 for directory data by using aggregate queries for room counts and follower counts.

Indexes used:

- `User.followedMatchRooms.matchId`
- `User.recentMatchRooms.lastVisitedAt`
- `CommunityNotification.dedupeKey`
- `CommunityPost.matchId`
- `CommunityPost.latestActivityAt`
- `CommunityFanEvent.eventKey`

Known limitation: follower counts are stored as aggregate query results, not a denormalized counter. If traffic grows, add a background-maintained counter to the match room summary layer.

## Security And Privacy

- Follow/unfollow uses the authenticated user from the session and ignores any client-provided `userId`.
- Match IDs are normalized before writes.
- Clients cannot provide follower counts, activity timestamps, summary state, notification recipients, notification type, or badge progress.
- Notification helpers exclude banned/suspended users and use unique dedupe keys.
- Activity indicators count only public approved content through the existing visibility filters.

## Future Roadmap

User-created independent rooms should be evaluated later after measuring thread usage, spam pressure, moderation workload, room fragmentation, and real user demand. The current production path keeps rooms tied to official match fixtures only.
