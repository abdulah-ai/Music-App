# 05 — Meaningful Moments

Read `00-OVERVIEW.md` first for the shared goals, hard free-only constraint, and default
tech shape. This file is otherwise self-contained.

**Read the "Honest scope caveat" section before starting.** This is the one app in the
program where "just build it" isn't the full story.

## Problem

A place to share a photo of something that genuinely matters to you, plus the reason
why — public, Twitter/X-shaped (feed, follows, likes, replies), rather than a private
vault like the other apps in this program.

## Feature bundle (capture → identify → organize → consume → rediscover)

- **Capture:** post a photo + a short written reason it matters.
- **Identify:** automated moderation pass on upload (see tech notes) before a post is
  publicly visible.
- **Organize:** a personal profile grid of your own posts.
- **Consume:** a public feed (global and/or following-based), like/comment/follow.
- **Rediscover:** "on this day" resurfacing of your own past posts (same pattern as
  app 01, applied to public posts).

## Honest scope caveat — read before building

Two things here are not solvable by better code, and the spec/feature list above
doesn't fix them:

1. **Cold start.** A brand-new public app has zero users on day one. "Everyone in the
   world will see it" doesn't happen just because the feature exists — that's a
   distribution/community problem, not an engineering one.
2. **Moderation and legal exposure.** The moment strangers can post publicly, the app
   takes on real responsibility for abusive/illegal content (harassment, CSAM, DMCA
   claims), regardless of budget.

**Recommended v1 scope change to actually ship something responsible for free:**
launch **invite-only / friends-first** (a follow-request or invite-code gate) rather
than fully open public posting, with the same UI/feed shape — this can expand later
once there's an actual moderation process in place, but should not launch fully open
by default.

## Tech notes (free-only)

- Storage: R2/B2 free tier for post images (not Render disk — ephemeral).
- Moderation: NudeNet or a similarly open-source NSFW/abuse image classifier (free,
  runs locally on CPU) as an automated first pass on every upload, plus a user
  report/block flow feeding a manual review queue.

## Data model (sketch)

- `User` (profile)
- `Post`: `id`, `user_id`, `image_url`, `reason_text`, `created_at`,
  `moderation_status`
- `Follow`: `follower_id`, `followee_id`
- `Like`: `post_id`, `user_id`
- `Comment`: `id`, `post_id`, `user_id`, `text`
- `Report`: `id`, `post_id`, `reporter_id`, `reason`, `status`

## Screens

- Feed (following and/or global, per the invite-only decision above)
- Post Detail
- Create Post
- Profile (own post grid)
- Notifications
- Report/Moderation flow

## API endpoints (sketch)

- `POST /posts`, `GET /posts/{id}`, `GET /feed`
- `POST /follow/{user_id}`, `DELETE /follow/{user_id}`
- `POST /posts/{id}/like`, `POST /posts/{id}/comments`
- `POST /reports`
- `GET /on-this-day` (own posts)

## Non-goals for v1

- No algorithmic "for you" ranking or ads — chronological/following feed only.
- No anonymous posting — every post traceable to an account, for moderation
  accountability.
- No fully open public signup until an invite/follow-request gate and moderation
  queue both exist and are working.
