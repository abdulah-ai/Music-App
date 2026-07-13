# 08 — Media Discovery & Watchlist

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and default
tech shape. This file is otherwise self-contained. This is the strongest/cleanest idea
in the program — no legal risk (metadata only), generous free API tiers across the
board. Keep it that way: metadata and tracking only, never file hosting/streaming.

## Problem

Deciding what movie, show, book, or game to try next, and keeping a single "want to
check out" list across all four media types instead of four separate apps.

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** add a movie/series/book/game to your watchlist from search or a
  suggestion feed.
- **Identify:** metadata lookup per type (see tech notes) — title, cover art, genre,
  rating, synopsis.
- **Organize:** one unified watchlist across all four types, filterable by type/status
  (want to / in progress / done).
- **Consume:** mark progress, rate on completion.
- **Rediscover:** resurfaces items added long ago and still untouched ("you added this
  8 months ago").
- **Signature feature — cross-media taste profile:** a strong rating on a movie nudges
  suggestions in books/games/series too (shared genre/mood tag space across all four
  types), rather than four independent recommendation silos.

## Tech notes (free-only)

- Movies/series: TMDB (free API key, generous limits).
- Books: Open Library (fully free, no key).
- Games: RAWG (free tier, ~20k requests/month) or IGDB (free via a Twitch developer
  account) — pick one, don't depend on both.
- Cache fetched metadata locally (don't re-fetch on every view) to stay well within
  free-tier request limits.

## Data model (sketch)

- `MediaItem`: `id`, `type` (movie/series/book/game), `external_id`, `title`,
  `cover_url`, `genres[]`, `metadata_json` (cached provider response)
- `WatchlistEntry`: `id`, `user_id`, `media_item_id`, `status`
  (want/in_progress/done), `rating` (nullable), `added_at`, `updated_at`
- `TasteProfile`: `user_id`, `genre_weights` (map of genre/mood tag → weight, updated
  on each rating)

## Screens

- Discover/Home — per-type suggestion rails, ranked by taste profile
- Watchlist — unified list, filterable by type/status
- Media Detail — metadata + add-to-watchlist / rate
- Taste Profile — visualization of what the app thinks you like
- Search

## API endpoints (sketch)

- `GET /discover?type=` — suggestions for a media type, taste-profile-ranked
- `GET /search?type=&q=`
- `POST /watchlist`, `PATCH /watchlist/{id}` (status/rating), `GET /watchlist`
- `GET /taste-profile`

## Non-goals for v1

- No media file hosting or streaming of any kind — metadata/tracking only, always.
- No social/sharing features in v1 (personal watchlist only).
- No dependency on any single provider's paid tier — if a free tier's limits are hit,
  degrade to cached data rather than upgrading to paid.
