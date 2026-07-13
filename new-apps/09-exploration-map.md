# 09 — Exploration Map

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and default
tech shape. This file is otherwise self-contained.

## Problem

Help users discover real-world areas near them, gamified as a fog-of-war exploration
game (unlock the map by physically visiting places), with a social layer comparing
exploration progress against friends.

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** the app records GPS visits in the background/on open (client-side
  geolocation), converting raw location into "visited" map tiles/cells.
- **Identify:** for each visited area, look up nearby points of interest so a visit can
  be tagged meaningfully (park, café, landmark) rather than just raw coordinates.
- **Organize:** a personal fog-of-war map — visited areas revealed, unvisited areas
  covered — plus a journal of visits.
- **Consume:** nearby-unexplored suggestions (points of interest near you that aren't
  unlocked yet), pulling you toward new areas.
- **Rediscover:** the visit journal itself resurfaces past discoveries ("you unlocked
  this a year ago") and shows % explored per city/country over time.
- **Social:** a friends leaderboard comparing exploration % per city/region.

## Tech notes (free-only)

- Maps: OpenStreetMap data via MapLibre GL (free, open-source renderer) — **not**
  Google Maps, which isn't free at real usage volumes. Free vector tile hosting
  options include MapTiler's free tier or self-hosting OSM tiles.
- POI/nearby suggestions: Overpass API (free, queries OSM's POI data directly).
- Visited-area representation: a grid/geohash system (e.g. bucket visits into
  geohash cells of a fixed precision) rather than raw point clouds — keeps
  fog-reveal rendering and % calculations simple.

## Data model (sketch)

- `User`
- `VisitedCell`: `id`, `user_id`, `geohash` (or grid cell id), `first_visited_at`,
  `visit_count`
- `JournalEntry`: `id`, `user_id`, `visited_cell_id`, `note`, `photo_url` (optional),
  `created_at`
- `Friendship`: `user_id`, `friend_id`
- Derived: exploration % per city/region (visited cells / total cells in that
  boundary), leaderboard ranking among friends

## Screens

- Fog Map (home) — your explored/unexplored map
- Nearby Suggestions — unvisited POIs near current location
- Journal — log of past visits, with optional photos/notes
- Leaderboard/Friends — exploration % comparison
- Profile Stats — cities/countries explored, streaks

## API endpoints (sketch)

- `POST /visits` — report a GPS position, server resolves to a grid cell and marks it
  visited
- `GET /map/fog?bounds=` — visited/unvisited cell data for the current map viewport
- `GET /nearby-suggestions?lat=&lon=` — Overpass-backed unvisited POIs nearby
- `GET /leaderboard`
- `POST /journal`, `GET /journal`
- `GET /stats/exploration?region=`

## Non-goals for v1

- No dependency on Google Maps or any paid mapping/geocoding service.
- No public/stranger location sharing — leaderboard and map data visible only to
  accepted friends.
- No continuous background location tracking beyond what's needed for visit
  detection — respect battery and privacy.
