# 04 — Study Assistant

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and default
tech shape. This file is otherwise self-contained.

Note: this idea started vague ("notes bla bla") — the spec below is the scoping
decision. Don't expand it further without deliberately revisiting scope; this space
(Anki, Obsidian, Notion) is crowded, so execution quality matters more than feature
count.

## Problem

Studying effectively means more than storing notes — it means knowing what you're
about to forget and reviewing it before you do. This app pairs simple note capture
with proven spaced-repetition science.

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** type notes directly, or photograph a page of notes/textbook.
- **Identify:** Tesseract OCR (local, free) turns photographed pages into editable
  text; a simple paragraph/bullet-splitting heuristic proposes flashcard front/back
  pairs from the text for the user to confirm/edit (not auto-committed blindly).
- **Organize:** notes and flashcards grouped by subject/deck.
- **Consume:** review/quiz mode using the **SM-2 spaced-repetition algorithm** (the
  same public, well-documented algorithm behind Anki — free, no licensing issue).
- **Rediscover:** a "forgetting curve" dashboard — per card, shows the predicted date
  it'll drop out of memory based on SM-2's interval/ease data, surfacing what needs
  review soonest. This proactive-resurfacing framing is the app's differentiator.
- Optional: a focus/Pomodoro timer tied to study sessions.

## Tech notes (free-only)

- SM-2 algorithm: implement directly (public spec, no dependency needed).
- Tesseract OCR: local, free, runs fine on CPU.
- Optional stretch: a local small LLM via Ollama (e.g. Qwen2.5-3B, 4-bit) to help
  draft flashcards from longer note blocks — optional and CPU-only; never required
  for core functionality, and always user-reviewed before saving.

## Data model (sketch)

- `Subject`: `id`, `user_id`, `name`
- `Note`: `id`, `subject_id`, `content`, `photo_url` (nullable)
- `Flashcard`: `id`, `subject_id`, `front`, `back`, `ease_factor`, `interval_days`,
  `repetitions`, `due_date`
- `StudySession`: `id`, `user_id`, `started_at`, `cards_reviewed`, `duration_seconds`

## Screens

- Subjects List
- Note Capture (text or photo → OCR)
- Deck View (cards per subject)
- Review/Quiz Mode (SM-2-driven)
- Forgetting-Curve Dashboard
- Focus Timer

## API endpoints (sketch)

- `POST /subjects`, `GET /subjects`
- `POST /notes`, `POST /notes/ocr` (photo → text)
- `POST /flashcards`, `GET /flashcards?subject_id=`
- `POST /flashcards/{id}/review` (grade → SM-2 update, returns new due date)
- `GET /dashboard/forgetting-curve`

## Non-goals for v1

- Not attempting Anki file-format import/export compatibility.
- No collaborative/shared decks.
- No requirement on a paid/cloud LLM for flashcard generation — manual entry always
  works without it.
