# Data Source Policy

This project uses three content layers:

- `api`: canonical live/sports/news data
- `ai`: generated summary/snapshot content
- `editorial`: curated preview/profile content

## Rules

- Core competition data should be API-first.
- AI can summarize, preview, recap, or explain; it should not replace canonical tables or fixture listings on main competition pages.
- Editorial pages are allowed for season previews, team profiles, and special features.

## Current page map

- `home`: hybrid
  Canonical: fixtures, standings, scorers, news
  Support: AI summary only

- `standings`: api
- `matches`: api
- `stats`: api
- `players`: api

- `clubs`: editorial
- `teams/[id]`: editorial

- `news`: hybrid
  Canonical: `/api/news`
  Support: AI rewrite only

- `ai-football-live`: ai
  Canonical: `/api/football/ai-snapshot`

- `worldcup-2026`: hybrid
  Canonical: `/api/worldcup/scores`, `/api/news?topic=worldcup`
  Support: `/api/worldcup/ai-hub`
