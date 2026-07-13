# 02 — Wardrobe

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and default
tech shape. This file is otherwise self-contained.

## Problem

Deciding what to wear, knowing what you actually own, figuring out what's worth buying
next, and not neglecting basic self-care. This app is two blended functions in one:
a closet/style manager, plus a self-care reminder layer (shower, laundry, skincare).

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** photograph each clothing item into the closet inventory; tag category
  (top/bottom/outerwear/shoes/etc.), color, and season.
- **Identify:** no AI call — color/category tagging is user-entered or a simple
  color-extraction-from-photo heuristic (dominant color sampling, not ML).
- **Organize:** closet grid filterable by category/color/season; per-item wear count
  and last-worn date ("cost-per-wear" — logs each time you mark an item as worn today).
- **Consume:** outfit suggestion screen — a **deterministic rules engine** (color-wheel
  complementary/analogous matching + warm/cool tone grouping) combined with a free
  weather lookup (Open-Meteo, no API key required) to suggest weather-appropriate
  combinations from what you actually own.
- **Rediscover:** "gap detection" — flags categories you're missing (e.g. "5 tops, 0
  neutral bottoms") as shopping suggestions, and resurfaces items you own but haven't
  worn in a long time.
- **Self-care layer:** scheduled reminders for shower/laundry/cleaning cadence, plus a
  static (non-AI, curated) skincare/self-care tips knowledge base keyed to a short
  quiz (skin type, concerns) done once at setup.

## Tech notes (free-only)

- No LLM/paid AI anywhere in v1 — outfit matching and skin advice are both rules-based
  or static-content-based by design, not just as a fallback. This keeps the "smart"
  features free indefinitely instead of rate-limited.
- Weather: Open-Meteo (free, no key).
- Storage: R2/B2 free tier for clothing photos.

## Data model (sketch)

- `ClothingItem`: `id`, `user_id`, `category`, `color`, `season`, `photo_url`,
  `wear_count`, `last_worn_at`, `created_at`
- `OutfitLog`: `id`, `user_id`, `date`, `item_ids[]`
- `SelfCareReminder`: `id`, `user_id`, `type` (shower/laundry/skincare/etc.),
  `frequency_days`, `last_done_at`
- `SkinProfile`: `user_id`, `skin_type`, `concerns[]` (drives static tip selection)

## Screens

- Closet Grid — filterable inventory
- Add Item — camera capture + tagging
- Outfit Suggestion — today's suggested outfit(s), weather-aware
- Shopping Gaps — categories missing from the closet
- Self-Care — reminders list + skin/self-care tips
- Wear History — cost-per-wear stats per item

## API endpoints (sketch)

- `POST /closet/items`, `GET /closet/items`
- `POST /outfits/suggest?date=` (pulls weather server-side, runs rules engine)
- `POST /outfits/log` — mark an outfit as worn today
- `GET /wardrobe/gaps`
- `GET /selfcare/reminders`, `POST /selfcare/reminders/{id}/done`
- `GET /selfcare/tips` (static, filtered by stored skin profile)

## Non-goals for v1

- No AI-generated styling advice (rules engine only, see tech notes — this is
  deliberate, not a placeholder).
- No e-commerce/checkout integration — shopping suggestions are just text, not links
  to buy.
- No outfit photo-realistic try-on/visualization.
