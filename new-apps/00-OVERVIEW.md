# 10 New Apps — Program Overview (Read First)

This folder holds specs for **10 independent apps**, each to become its own standalone
GitHub repository. They are not part of the Music App (`Starhollow` / `SuperMediaApp`)
codebase — this repo just hosts the planning docs. Each numbered file
(`01-...` through `10-...`) is a **self-contained brief**: if you are handed only that
one file plus this overview, you should have everything needed to start building that
app in a fresh repo.

## The shared idea

Every app should feel like the Music App, structurally: a personal utility that bundles
**more than one function** around a single theme, following this loop:

1. **Capture** — save/import something (a photo, a note, an item, a conversation).
2. **Identify** — extract structure from it (OCR, parsing, categorization, metadata lookup).
3. **Organize** — a personal library/collection view of everything captured.
4. **Consume** — the actual playback/use moment (view, cook, wear, read, chat, explore).
5. **Rediscover** — proactively resurface things the user saved and forgot about.

Not every app needs all five in its first version, but the spec files call out which of
these five each feature bundle maps to, and that mapping is the thing to preserve — it's
what makes these "Music App siblings" rather than generic CRUD apps.

## Hard constraints — read before choosing any library or API

**Everything must run for $0.** No paid API tiers, no paid hosting tier, no paid model
inference. Every spec below only names free/open-source tools and free API tiers for
this reason. If a feature can't be done free, the spec either drops it, replaces it with
a deterministic/rules-based version, or explicitly flags it as a known quality ceiling
(see apps 05, 07, 10) — do not silently reach for a paid service to "make it better."

**Target hardware for anything that runs locally (recognition, OCR, local LLM
inference, voice transcription):** Intel Core i7-10750H (6 cores / 12 threads,
2.60GHz), ~8GB RAM, NVIDIA GeForce GTX 1650 Ti (4GB VRAM) + Intel UHD integrated
graphics, Windows 10. Concretely this means: OCR (Tesseract) and small quantized LLMs
(≤3B, maybe a squeezed 7B in 4-bit) are fine; do not assume enough VRAM/RAM for
anything bigger locally. Where a spec needs heavier fine-tuning (app 07's QLoRA
personality adapters), it explicitly calls out using **free Colab** sessions for the
training step, then bringing the small resulting adapter back to local/free inference.

## Default technical shape (deviate only where a spec says so)

Apps 01–09 follow the Music App's shape:

- **Backend:** FastAPI, async SQLAlchemy, SQLite by default (Postgres-compatible via
  config), deployable to Render's free web-service tier.
- **Frontend:** Expo / React Native Web + TypeScript + Zustand + React Navigation,
  mobile-first responsive web, optionally wrapped in Capacitor for Android later.
- **Storage:** Render's free-tier disk is ephemeral (confirmed pain point in the Music
  App's own README) — any app that stores photos/media **must** use a real free-tier
  object store (Cloudflare R2 or Backblaze B2, both ~10GB free, no/low egress fees)
  instead of local disk.
- **Deploy:** a `render.yaml` Blueprint per repo, same pattern as this repo's own
  `render.yaml`.

**App 10 (Local Jarvis) is the one exception** — it's a local desktop-resident service,
not a mobile app talking to a cloud backend. Its spec describes its own shape.

## Non-goals across the whole program

- No feature in any spec should require paying for an API, a model host, or a hosting
  tier to reach its described "done" state.
- No app hosts or streams copyrighted media files it doesn't have rights to (this is
  why app 08 is metadata/tracking only, not a streaming service).
- Don't add scope beyond what a spec lists as in-scope for v1; each spec's "Non-goals"
  section is deliberate, not an oversight.

## The 10 apps

01. Memory Calendar — a 365-day slot photo journal, layered across years.
02. Wardrobe — closet inventory, rule-based outfit suggestions, self-care reminders.
03. Fridge — pantry tracking, expiry alerts, recipe suggestions from what you have.
04. Study Assistant — notes → flashcards, spaced repetition, forgetting-curve dashboard.
05. Meaningful Moments — public photo+reason feed, Twitter-like (scope caveats inside).
06. Book Writer's Studio — distraction-free book editor, custom fonts, later narration.
07. AI Companion — customizable-personality chat companion with long-term memory
    (quality-ceiling caveat inside — read it before starting).
08. Media Discovery & Watchlist — unified movie/series/book/game discovery + tracking.
09. Exploration Map — fog-of-war real-world exploration game with a friends leaderboard.
10. Local Jarvis — local PC automation assistant (different architecture — see its spec).
