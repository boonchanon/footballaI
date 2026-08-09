# Community Match Hub Demo Override

Sprint 4.8.5 adds an admin-only demo override for Match Hub timeline experience.

## Scope

- The provider fixture remains read-only.
- The override never changes fixture status, score, kickoff, teams, venue, events, or provider payload.
- The override changes only the effective Match Hub phase used by navigation priority, room availability, recommendation, and UI state.
- Poll and AI Summary use existing real data only.

## Phases

- `auto`: uses provider status through the existing timeline helper.
- `pre_match`: opens Preview Lounges, recommends preview, keeps Main Room available, and keeps Reaction Lounges closed.
- `live`: highlights Main Room and Tactical Room, keeps temporary lounges closed, and shows real provider events if available.
- `full_time`: opens Reaction Lounges, highlights post-match experience, and keeps preview closed.

## Admin Controls

Admins with existing `admincommunity` or `superadmin` permission can manage the override from:

`/admin/community/match-rooms/[matchId]`

The Demo Controls card shows:

- Provider phase
- Effective phase
- Current demo override
- `DEMO OVERRIDE` badge when active

Applying or resetting requires a non-empty reason. The server reads the actor from the session and accepts only the requested phase and reason from the client.

## Storage And Audit

No new model or collection is introduced. The latest `ModerationLog` action for the match is used as the current override state.

Audit actions:

- `demo_override_set`
- `demo_override_reset`

Audit metadata includes actor id, actor role, match id, previous phase, new phase, reason, and update time.

## User Experience

When a demo override is active, the user-facing Match Hub uses the effective phase. A Demo Mode badge may appear, but the real provider status and score remain visible so the UI does not imply that official match data changed.
