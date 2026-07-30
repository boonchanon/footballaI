# Community Match Room Routes

## Route Structure

- `/community` shows the main community feed and a compact Match Rooms section only.
- `/community/matches` is the Match Rooms directory with search and status filtering.
- `/community/matches/[matchId]` is the dedicated room for one server fixture.

Invalid `matchId` values intentionally render an empty/not-found state and do not fallback to another match.

## Data Sources

- Fixtures are loaded through the existing `getMatchRoomFixtures()` helper in `lib/server/community-match-room.ts`.
- The helper normalizes server fixture fields into the existing `MatchRoomFixture` shape.
- Match posts reuse `CommunityPost.matchId` and `CommunityPost.matchContext`.
- Discussion and poll counts are aggregated from existing published and approved community posts.

## Match Status Behavior

- Finished statuses can open post-match poll creation.
- Live statuses display as live/half-time states.
- Closed statuses are still visible in direct contexts but skipped for default room selection.
- Scores always come from server fixture data or stored `matchContext`; client-provided score/status values are not trusted.

## Tabs

The dedicated room supports query-string tabs:

- `?tab=overview`
- `?tab=discussion`
- `?tab=threads`
- `?tab=polls`
- `?tab=summary`

Tabs are controlled through the URL so refresh and browser back/forward keep the active state.

## Composer And Poll Builder

- The main `/community` composer now starts compact: title, text, media tools, poll entry, visibility, and submit actions.
- Team/player/category context is hidden behind the Advanced Context toggle.
- Poll options are not rendered inside the main composer. The Poll button opens a dedicated Poll Builder dialog.
- Poll Builder supports 2-6 options, option reordering, duplicate-option validation, and a preview panel.
- Saving a poll returns to the composer with a compact Poll Summary Card.
- Match-linked compose URLs such as `/community?matchId=...&compose=poll` keep `matchId` attached and let the server revalidate it before creating the post.

## Official And User Polls

- User-created polls continue to reuse `CommunityPost.poll` and `/api/community/posts/[id]/poll`.
- Community poll moderation is enforced by sending poll question/options through the existing text moderation path during post creation.
- Official Poll UI is reserved for server-derived match facts only.
- If lineup/events are unavailable, Official Poll remains empty instead of inventing options.

## Vote Policy

- Vote user identity comes from the authenticated session.
- Duplicate same-option votes are idempotent.
- Changing a vote moves one vote from the previous option to the new option without increasing total votes.
- Match-linked poll voting is allowed only when the stored match status is finished.

## Desktop And Mobile Layout

- Desktop uses a hero plus a two-column overview with sidebar cards.
- Mobile keeps a single column, horizontally scrollable tabs, and large touch targets.
- Animation is limited to subtle hover/transition states and should respect reduced-motion preferences.

## Known Limitations

- Poll Builder is UI-level and still creates polls through the existing CommunityPost create flow.
- Official Poll generation is not enabled until real lineup/events are available.
- New Discussion Threads are not included in this phase.
- User-created Rooms are not enabled.
- Match statistics display only when real server data is available; no mock stats are rendered as facts.
