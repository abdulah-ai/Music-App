# 03 — Fridge

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and default
tech shape. This file is otherwise self-contained. This is the strongest-scoped idea of
the ten — keep it focused rather than expanding it.

## Problem

Deciding what to cook from what's actually in the fridge/pantry, avoiding food waste
from things rotting unnoticed, and buying only what's genuinely missing. A real
kitchen assistant, not just an inventory list.

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** add pantry items by barcode scan, by photographing a receipt (OCR), or
  manually.
- **Identify:** barcode → product lookup via Open Food Facts (free, huge open product
  database) to auto-fill name/category/default shelf-life; receipt photos → Tesseract
  OCR (local, free, runs fine on CPU) to extract item names/quantities.
- **Organize:** pantry inventory grouped by category, each item showing an expiry
  countdown.
- **Consume:** recipe suggestions from TheMealDB (free, no rate limit for personal use),
  scored by percentage of the recipe's ingredients you already have. A **"use-it-up"
  mode** specifically ranks recipes by how many soon-to-expire items they'd clear —
  this is the app's signature feature ("no matter how low food you have, find a
  recipe").
- **Rediscover:** expiry timers/push alerts before food goes bad; a running "food waste
  avoided" counter for motivation.
- **Shopping:** a minimal shopping list auto-generated from gaps between "recipes you
  could almost make" and what's missing.

## Tech notes (free-only)

- Open Food Facts (free, open) for barcode → product metadata.
- TheMealDB (free, no key, no meaningful rate limit at personal scale) for recipes.
  Spoonacular can be a secondary/optional source but its free tier is rate-limited —
  don't depend on it for core functionality.
- Tesseract OCR, run locally — no cloud OCR service needed.

## Data model (sketch)

- `PantryItem`: `id`, `user_id`, `name`, `category`, `quantity`, `expiry_date`,
  `source` (barcode/receipt/manual), `barcode` (nullable), `created_at`
- `Recipe` (cached from TheMealDB): `external_id`, `title`, `ingredients[]`,
  `instructions`, `image_url`
- `ShoppingListItem`: `id`, `user_id`, `name`, `added_reason` (e.g. "for Recipe X")

## Screens

- Pantry Inventory — grouped by category, expiry countdowns, color-coded urgency
- Add Item — barcode scanner / receipt photo / manual entry
- Recipe Suggestions — ranked by % ingredients on hand
- Use-It-Up — ranked by expiry-clearing priority
- Recipe Detail / Cook Mode — step-by-step, ingredients checklist
- Shopping List

## API endpoints (sketch)

- `POST /pantry/items`, `GET /pantry/items`, `DELETE /pantry/items/{id}`
- `POST /pantry/scan` (barcode) → Open Food Facts lookup → pre-filled item
- `POST /pantry/receipt` (image) → OCR → list of candidate items to confirm
- `GET /recipes/suggest` — ranked by ingredient match %
- `GET /recipes/use-it-up` — ranked by expiry-clearing priority
- `GET /shopping-list`, `POST /shopping-list/generate`

## Non-goals for v1

- No grocery delivery/checkout integration.
- No calorie/nutrition tracking (recipe suggestion only, not a diet app).
- No paid recipe API dependency for core functionality.
