# Community Match Room AI Summary

## Architecture

Match Room summary reads match facts from the server only. The client can send `matchId` to read a room or request admin regeneration, but it cannot send score, events, players, prompt, model, poll totals, or statistics.

## Facts Source

- Match fixture facts from the football service.
- Approved Community posts, threads, comments, and replies after source-safety filtering.
- Approved poll aggregates from Community posts.

## Output Shape

The summary is backward-compatible with the old `{ source, text }` response and also includes structured fields:

- `headline`
- `shortSummary`
- `matchStory`
- `keyMoments`
- `turningPoint`
- `statisticsHighlights`
- `topPlayers`
- `tacticalSummary`
- `fanReaction`
- `limitations`
- `disclaimer`

## Validation And Fallback

AI output is parsed as JSON and validated before it is returned. The validator blocks unsafe gambling output, wrong score claims, unsupported xG or possession claims, and summaries that do not include the server team names. Invalid provider output falls back to a fact-only template.

## Cache And Stale

Summary cache is DB-backed through `CommunityMatchSummary`. `sourceDataVersion` changes when core server facts or selected Community aggregates change. `GET /api/community/match-room` never generates AI output; it only reads the persisted summary or returns a fact-only template preview.

If persisted output becomes stale, the server marks it as `stale` atomically and keeps showing the old summary with a stale indicator until an admin regenerates it. `summaryVersion` and `sourceDataVersion` are stored persistently so multiple server instances see the same state.

## Admin Generate

`POST /api/community/match-room/summary` is restricted by `canManageCommunityAdmin`. It accepts only `matchId`, rebuilds facts and approved aggregate sources on the server, acquires a DB lock with TTL, refuses unfinished matches, persists the new summary, and appends metadata-only history in `CommunityMatchSummaryHistory`.

`GET /api/community/match-room/summary?matchId=...` returns the current summary metadata and regenerate history for admin UI. It does not expose raw prompts, raw comments, provider payloads, or API keys.

## Statuses

- `not_generated`: no persisted summary yet; GET returns a fact-only template preview.
- `generating`: an admin regeneration is currently holding the DB lock.
- `generated`: AI output passed validation and is persisted.
- `template`: provider unavailable or invalid output fell back to a safe fact-only template.
- `failed`: generation failed without publishing a new usable summary.
- `stale`: stored `sourceDataVersion` no longer matches current facts or aggregate sources.

## Fan Reactions

Fan Reactions are aggregate-only and labeled as Community opinion. Sentiment is not shown unless approved content meets the minimum threshold. Community comments are untrusted data and cannot change match facts.
