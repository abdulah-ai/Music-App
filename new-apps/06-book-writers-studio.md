# 06 — Book Writer's Studio

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and default
tech shape. This file is otherwise self-contained.

## Problem

Writers need a real, focused place to write their book — their own font, their own
words, no distractions — with narration added as a later phase.

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** write chapters in a distraction-free editor.
- **Identify:** n/a — this app has no extraction/AI step in v1.
- **Organize:** chapters, drafts, and version history per book; user-selectable font
  per book/project.
- **Consume:** a clean reading view, plus export to EPUB/PDF.
- **Rediscover:** word-count goals/streaks and a "pick up where you left off" view
  surfacing unfinished chapters.
- **Phase 2 (explicitly later, not v1):** narration — turn a finished chapter/book into
  audio.

## Tech notes (free-only)

- Fonts: Google Fonts (free, self-hostable font files — bundle them, don't hotlink to
  avoid a runtime dependency on Google's CDN if that matters for offline use).
- Export: pandoc or ebooklib (both free/open-source) for EPUB/PDF generation.
- Narration (phase 2): Piper TTS (free, open-source, runs locally on CPU — no GPU
  needed, no paid narration API). Multiple Piper voice models can serve as different
  "narrator voices" at no extra cost.

## Data model (sketch)

- `Book`: `id`, `user_id`, `title`, `font_family`, `created_at`
- `Chapter`: `id`, `book_id`, `title`, `content`, `order`, `word_count`
- `Draft`/version snapshot: `id`, `chapter_id`, `content`, `saved_at`
- `NarrationJob` (phase 2): `id`, `book_id` or `chapter_id`, `status`, `audio_url`,
  `voice_model`

## Screens

- Library (my books)
- Editor (distraction-free, font picker)
- Chapter List / reorder
- Export (EPUB/PDF)
- Writing Stats (word-count goals, streaks)
- Narration (phase 2)

## API endpoints (sketch)

- `POST /books`, `GET /books`, `PATCH /books/{id}` (font, title)
- `POST /books/{id}/chapters`, `PATCH /chapters/{id}`
- `GET /chapters/{id}/versions` (draft history)
- `POST /books/{id}/export?format=epub|pdf`
- `POST /books/{id}/narrate` (phase 2)

## Non-goals for v1

- No publishing/marketplace/distribution features.
- No collaborative/multi-author editing.
- No narration in v1 — that's an explicit phase 2, don't build it alongside the
  editor unless the editor itself is solid first.
