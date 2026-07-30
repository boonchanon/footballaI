# Community Match Room Hardening

## Match Room Flow

- `/api/community/match-room` loads fixtures from the server football service.
- The client may request `matchId`, but score/status/team facts are always resolved server-side.
- Invalid `matchId` returns no selected fixture instead of silently using another match.
- Default selection skips postponed/cancelled fixtures when possible.
- Post creation with `matchId` requires that the fixture exists server-side.

## Poll Rules

- Poll voting uses the authenticated session user only.
- `userId`, vote totals, and option counts from the client are ignored.
- A post-match poll tied to `matchId` accepts votes only when the stored match status is finished.
- Repeating the same vote is idempotent and does not increment totals.
- Changing vote is allowed and keeps `totalVotes` unchanged.
- Invalid options are rejected.

## Badge Rules

- Fan profile progress is backed by unique fan events.
- Duplicate events do not increment counters again.
- Pending/rejected posts do not award post or Match Room badges.
- Poll-vote badge/progress is awarded only on the first vote event per post and user.

## Notification Behavior

- Poll vote notifications are not sent to the author when the author votes on their own poll.
- Notification dedupe key: `poll-vote:{postId}:{voterId}:{ownerId}`.
- Duplicate key races are caught and return the existing notification.
- Hidden/rejected posts are blocked before notifications are created.

## AI Summary

- AI summary generation uses only server fixture facts.
- Unfinished matches use fallback summary.
- Summary generation is cached in memory for 10 minutes per match/fact combination.
- Provider errors fall back to a fact-only template.
- Generated output containing gambling terms is discarded and replaced with fallback.

## Privacy

- Fan Profile UI shows public/community-safe fields only: badges, approved activity counters, favorite teams/players, joined date.
- It does not show strikes, moderation history, email, admin actions, notification settings, or internal moderation scores.

## Known Limitations

- Summary cache is process-local and resets when the Next.js process restarts.
- Poll votes are embedded in `CommunityPost`; atomic updates are used, but a dedicated `PollVote` collection would be stronger for very high write volume.
- Fan stats use event dedupe going forward; existing historical counters may need a one-time recompute script if old data was already over-counted.
