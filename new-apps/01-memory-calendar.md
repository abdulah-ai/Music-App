# 01 — Memory Calendar

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and default
tech shape. This file is otherwise self-contained.

## Problem

People take meaningful photos throughout the year and then lose track of them in a
generic camera roll. This app gives every calendar day (Jan 1–Dec 31, 366 slots
including Feb 29) a permanent "slot" — each year you fill that slot in again, so over
time a single day (e.g. "March 14") builds up a stack of photos from every year you've
used the app. The whole product lives or dies on how that stacking is displayed.

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** add one or more photos to today's slot (or backfill an earlier date).
  Optional short caption per photo.
- **Identify:** none required (no OCR/AI needed) — this app is intentionally simple.
- **Organize:** a 365/366-day grid (calendar-shaped), each cell showing the most recent
  year's thumbnail with a small "×N years" badge if multiple years exist for that day.
- **Consume:** tapping a day opens a "stacked years" view — every year's photo(s) for
  that day, newest first, swipeable.
- **Rediscover:** on app open, a "years ago today" card surfaces past entries for
  today's date across every prior year. A streak/coverage indicator shows % of the year
  filled so far.

## Tech notes (free-only)

- Storage: Cloudflare R2 or Backblaze B2 free tier for photos — **not** local/Render
  disk (ephemeral, see overview). Compress/resize images client-side before upload to
  stretch the free storage quota.
- No AI/ML dependency at all for v1 — pure CRUD + object storage + a notification
  scheduler (daily local push/reminder to add today's photo).

## Data model (sketch)

- `User`
- `DayEntry`: `id`, `user_id`, `month`, `day` (1–31, plus leap-day flag), `year`,
  `photo_url`, `caption`, `created_at`
- Derived/computed: coverage % (distinct `(month, day)` filled this year / 366),
  current streak (consecutive days added)

## Screens

- Calendar Grid (home) — full-year grid, today highlighted
- Day Detail — stacked years view for one `(month, day)`
- Add Photo — camera/gallery picker, optional caption, defaults to today
- Year Recap — end-of-year summary/slideshow of the whole year's entries
- Settings — daily reminder time, export/download all photos

## API endpoints (sketch)

- `POST /days/{month}/{day}/entries` — add a photo for a given day (defaults year=current)
- `GET /days/{month}/{day}` — all years' entries for that day
- `GET /calendar?year=` — full grid data for a year
- `GET /on-this-day` — today's date across all past years
- `GET /stats/coverage` — streak + coverage %

## Non-goals for v1

- No video support (photos only).
- No public/social sharing — private per-user only.
- No face recognition or auto-tagging.
