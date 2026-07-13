# 10 — Local Jarvis

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and
hardware envelope. **This app does not follow the shared FastAPI + Expo/RN Web shape
that apps 01–09 use** — it's a local desktop-resident service, not a mobile app
talking to a cloud backend. This file is otherwise self-contained.

## Problem

A personal automation assistant that runs on your own PC and handles everyday
repetitive tasks — file/app management, reminders, routines — with natural-language
(typed or spoken) commands as the front end.

## Scope decision — read before building

"Automate everything" is not a buildable v1 scope. This spec deliberately narrows it:
the automation core (file rules, app/shortcut launching, scheduled routines, macros)
is **pure OS scripting with zero AI involved** — instant, reliable, free. A small local
LLM is used **only** for routing a natural-language command to one of these predefined
actions (intent classification), never for open-ended reasoning. This narrow AI role
is exactly the kind of task small models are actually good at, which is what makes
this fully achievable free on your hardware — don't widen the AI's job back toward
general reasoning, that's where the hardware ceiling (see overview) bites hard.

## Feature bundle

- **Automate:** predefined routines — file organization rules (e.g. "move all
  screenshots older than 7 days to an archive folder"), app/shortcut launching,
  scheduled tasks (reminders, recurring actions), hotkey-triggered macros. All pure
  OS-level scripting, no AI.
- **Command:** type or speak a command in natural language; a small local LLM
  classifies it against the user's defined routines and triggers the matching one
  (or asks for clarification if ambiguous — it should never guess silently).
- **Listen:** short voice commands captured via Whisper.cpp (free, local, CPU — use
  the "small"/"base" model size, not a larger one, given the hardware envelope).
- **Learn:** new routines are added by the user demonstrating/recording a macro
  (literal recorded steps), not by hoping the AI infers a new capability on its own.
- **Remind:** scheduled reminders/routines surfaced as OS notifications.

## Tech notes (free-only)

- Local service: Python (or Node) background process/tray app — this is a
  desktop-resident daemon, not a web-hosted API.
- Command routing: Ollama running a small model (Qwen2.5-3B or Phi-3-mini, 4-bit) —
  CPU inference is fine for short intent-classification prompts, no need to push GPU
  offload hard for this narrow task.
- Voice: Whisper.cpp, "small" or "base" model, CPU — appropriate for short commands,
  not long-form dictation.
- Automation execution: native OS scripting (PowerShell on Windows, or a library like
  `pyautogui`/`keyboard` for hotkey macros) invoked by the local service.
- UI: a lightweight local interface — a system tray icon + a simple local web UI
  (served on localhost only) is enough; this does not need the Expo/React Native
  stack the other 9 apps use.

## Data model (sketch)

- `Routine`: `id`, `name`, `trigger_phrases[]` (example utterances for intent
  matching), `actions[]` (ordered list of concrete steps)
- `Macro`: `id`, `routine_id`, `recorded_steps` (literal recorded keystrokes/clicks or
  script)
- `ScheduledTask`: `id`, `routine_id`, `schedule` (cron-like), `last_run_at`
- `CommandLog`: `id`, `raw_text`, `matched_routine_id` (nullable — null means it asked
  for clarification instead of guessing), `created_at`

## Interface (sketch)

Local-only, not a public API — an HTTP/IPC interface on `localhost` for the tray UI
to talk to the background service:

- `GET /routines`, `POST /routines`, `POST /routines/{id}/run`
- `POST /macros/record` (start/stop a macro recording session)
- `POST /commands` — natural-language text in, routes to a routine or returns a
  clarification prompt
- `GET /schedule`, `POST /schedule` — scheduled task management
- `GET /logs` — command history

## Non-goals for v1

- Not a general open-ended reasoning agent — the LLM's job is strictly intent
  routing among user-defined routines, never free-form task execution it invents
  itself.
- Not cloud-connected by default — no data leaves the machine.
- No attempt to "automate everything" in one v1 — ship a handful of solid routine
  categories (files, app launching, reminders, macros) rather than an open-ended list.
