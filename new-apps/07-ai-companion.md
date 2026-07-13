# 07 — AI Companion ("Friend")

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, hardware
envelope, and default tech shape. This file is otherwise self-contained.

**Read the "Honest quality-ceiling caveat" section before starting.** This is the
hardest app in the program to get right for free, and the spec below is written
around that constraint rather than pretending it away.

## Problem

A customizable AI companion you can talk to about anything — positioned as emotional
support/relaxation, not a replacement for licensed therapy. Its differentiator is
**long-term memory**: it should actually remember past conversations over time,
instead of resetting every session.

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** ongoing chat conversation.
- **Identify:** periodic self-summarization of the conversation into durable memory
  entries (the model summarizes what it just learned about the user).
- **Organize:** a searchable memory store (what the companion "knows" about the user),
  browsable as a timeline.
- **Consume:** the chat interface itself, with an editable persona (name, tone, traits).
- **Rediscover:** the companion proactively references relevant past memories in
  conversation ("last time you mentioned X...") — this is the actual product, not a
  side feature.

## Honest quality-ceiling caveat — read before building

Your target hardware (GTX 1650 Ti, 4GB VRAM) genuinely cannot run a large, highly
coherent local LLM. Realistic local models: ~3B parameters comfortably, maybe a
squeezed 7B in 4-bit with reduced context. These will be noticeably less fluent and
less emotionally nuanced than commercial cloud companions (Replika, Character.AI, Pi).
**Do not try to close this gap by quietly calling a paid cloud API** — that breaks the
free-only constraint. Instead, lean into what the free/local approach is actually good
at and position the product around it:

- **Fully private** — conversations never leave the device by default.
- **Genuinely personalized memory** — a small model with real persistent memory can
  still feel more "known" over time than a smarter model that forgets you every
  session.

Build for "consistent and yours," not "as smart as ChatGPT."

## Tech notes (free-only)

- Local inference: Ollama running a small open-weights model (e.g. Qwen2.5-3B-Instruct
  or Phi-3-mini), 4-bit quantized, CPU or partial GPU offload.
- Personality customization: QLoRA adapters, **trained on free Google Colab sessions**
  (T4 GPU, 16GB VRAM, free tier) rather than locally — your local GPU can't
  comfortably train even a 3B QLoRA fine-tune. Bring the resulting small adapter file
  back to local inference afterward.
- Memory: a local vector store (Chroma, or SQLite + FTS as a simpler free
  alternative) holding periodic conversation summaries with embeddings for retrieval;
  summarization itself is done by the same local model, just run as an occasional
  background job (slower is fine, it's not interactive-latency-sensitive).

## Data model (sketch)

- `Persona`: `id`, `user_id`, `name`, `traits`, `adapter_ref` (nullable — which QLoRA
  adapter, if any, is active)
- `Conversation`: `id`, `persona_id`, `started_at`
- `Message`: `id`, `conversation_id`, `role`, `content`, `created_at`
- `MemorySummary`: `id`, `user_id`, `text`, `embedding`, `source_conversation_id`,
  `created_at`

## Screens

- Chat
- Persona Editor (name/traits/tone)
- Memory Timeline (browsable summaries, "what it remembers about you")
- Safety/Resources (crisis-line info, "not a licensed therapist" framing — always
  visible/accessible, not buried in settings)
- Settings (model selection, data export/delete)

## API endpoints (sketch)

- `POST /chat/send`, `GET /conversations/{id}/messages`
- `POST /personas`, `PATCH /personas/{id}`
- `GET /memory/search?q=`, `GET /memory/timeline`
- `POST /memory/summarize` (background job trigger, or run on a schedule)

## Non-goals for v1

- No clinical diagnosis, treatment planning, or any claim of replacing licensed care —
  the safety/resources screen is not optional.
- No data leaving the device to a third-party cloud LLM by default.
- Not competing on raw conversational IQ against commercial cloud companions — see
  the caveat above.
