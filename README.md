# PartnerGoals

A private, single-user app for keeping track of your partner's preferences and
important dates — so you can be a more thoughtful partner. No sign-up, just a
password gate.

## Stack

- **Next.js** (App Router) + TypeScript
- **Postgres via Neon** + **Drizzle ORM**
- **Vercel** for hosting, with the Vercel Blob integration for gift photos
- Plain CSS via Tailwind, no client-side framework beyond what Next.js ships

## Pages

- `/login` — password gate
- `/` (a.k.a. `/notifications`) — the home feed: open reminders first, newest
  first, with "Mark done" and "Snooze" on each
- `/profile` — your partner's essentials (sizes, birthday, dietary notes, etc.)
- `/preferences` — likes/loves/dislikes, grouped by category
- `/dates` — birthdays, anniversaries and other key dates, sorted by what's
  coming up next; dates marked "sensitive" render quietly with no
  gift-planning framing
- `/gifts` — a log of gifts given, newest first, with an optional photo
- `/activities` — a log of things you've done together
- `/restaurants` — favorite restaurants; each has a detail page with a
  reservation link/embed for its booking platform
- `/stores` — an allowlist of trusted stores/brands

## Key-date reminders

A daily job (`/api/cron/daily`, triggered by Vercel Cron — see `vercel.json`)
walks every `key_date` row and compares today against `date - lead_time_days`,
accounting for annual recurrence by comparing month/day rather than year.
When a date falls inside its lead-time window and there isn't already an open
reminder for it this cycle, it writes a `notification` row:

- **Non-sensitive dates** pull the partner's top preferences and the most
  recent gift(s) with a matching or otherwise recent occasion, and nudge with
  something like _"Her birthday is in 12 days. Last time: silk scarf. Likes:
  peonies, Thai food."_
- **Sensitive dates** stay quiet — just the label and date, no gift framing:
  _"In 5 days: Anniversary — June 1."_

These show up in the `/notifications` feed (also the home page). Dismissing
("Mark done") clears it; snoozing hides it until the chosen number of days
has passed, without losing it.

To run the check manually (e.g. to test locally), hit the route with the
`CRON_SECRET` you configured:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

If `CRON_SECRET` isn't set, the route runs unauthenticated — fine for local
dev, but set it before deploying so the endpoint isn't open to anyone who
finds the URL.

## Restaurant discovery

`/restaurants` holds your favorite spots. Each one can carry a booking
platform (OpenTable, Resy, or other) and a venue ID or URL — paste either the
platform's own ID/slug for that restaurant, or (safest, especially for Resy)
the full URL to its page on that platform. The detail page
(`/restaurants/[id]`) shows a reservation option built from that:

- **OpenTable**, bare ID: an embedded iframe of OpenTable's own reservation
  widget, plus a plain "Open on OpenTable" link as a guaranteed fallback.
- **Resy**, bare ID: an attempt at Resy's public button-widget embed, plus a
  fallback link to search for the restaurant on resy.com.
- **Any platform, full URL pasted**: just a direct "Reserve" link to that URL
  — the most reliable option, since it can't depend on embed syntax at all.
- **No venue ID, or platform "other"**: a plain message pointing you to call
  or check the restaurant's own site.

Nothing here ever books anything automatically — every path either embeds
the platform's own official widget (so booking happens in their iframe, with
their own login/payment flow) or link out to their page. No API keys,
scraping, or stored credentials for either platform. (The exact widget embed
syntax for OpenTable/Resy couldn't be verified against their live docs while
building this — if a widget doesn't render, the fallback link next to it
always works, and it's worth checking their current widget docs to update
`src/components/BookingWidget.tsx` if needed.)

The same daily cron job also:

- **Surfaces favorites periodically** (roughly weekly per restaurant) with a
  `restaurant_surface` notification linking to that restaurant's page — a
  reminder to go check availability yourself, not a live signal (there's no
  read access to OpenTable/Resy's actual availability — scraping either
  platform would violate their Terms of Service, so this app doesn't attempt
  it).
- **Bundles 2-3 similar nearby restaurants** (`restaurant_similar`) alongside
  each surfaced favorite, via the Google Places API (Nearby Search + Place
  Details), with rating, review count, and distance.
- **Flags new nearby openings** (`restaurant_opening`) once a month, by
  diffing a rolling snapshot of nearby Places results (filtered to cuisines
  you've favorited or listed as a food preference) against what's been seen
  before.

All three need `GOOGLE_PLACES_API_KEY` set and your partner's `city` filled
in on `/profile` (used to geocode a search origin). Without a key, favorite
check-ins still fire — just without the similar-restaurant bundle or opening
alerts.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in:
   - `DATABASE_URL` — a Postgres connection string. For local development,
     the easiest path is a free [Neon](https://neon.tech) project (copy the
     connection string from your project dashboard). A local Postgres
     instance also works for schema/migration purposes, but the app's
     runtime query driver (`@neondatabase/serverless`, HTTP-based) expects a
     real Neon endpoint to actually serve pages.
   - `APP_PASSWORD` — whatever password you want to use to unlock the app.
   - `BLOB_READ_WRITE_TOKEN` — optional, only needed if you want to upload
     gift photos as files instead of pasting a photo URL. See below.

3. **Create the database schema**

   ```bash
   npm run db:generate   # generates SQL migrations from src/db/schema.ts (already committed under /drizzle)
   npm run db:migrate    # applies migrations to DATABASE_URL
   npm run db:seed       # seeds the store allowlist with Leah Alexandra + Quince
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, enter your `APP_PASSWORD`, and you're in.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add the **Neon** integration (Storage tab) to provision Postgres and set
   `DATABASE_URL` automatically — or paste your own Neon connection string as
   an environment variable.
3. Set `APP_PASSWORD` as an environment variable in the Vercel project
   settings.
4. (Optional, for gift photo uploads) Add the **Blob** integration (Storage
   tab) — this sets `BLOB_READ_WRITE_TOKEN` automatically. Without it, you
   can still log gifts by pasting a photo URL instead of uploading a file.
5. Set `CRON_SECRET` as an environment variable (any random string) — Vercel
   automatically sends it as a bearer token when it triggers
   `/api/cron/daily`, so the route only runs for real Cron invocations (or
   you, with the same value). The cron schedule itself lives in
   `vercel.json` and needs no extra setup.
6. (Optional, for restaurant discovery) Set `GOOGLE_PLACES_API_KEY` — a
   Google Cloud API key with the Places API and Geocoding API enabled.
7. After the first deploy, run the migration against your production
   database once (e.g. `DATABASE_URL=... npm run db:migrate` from your
   machine, or via a Vercel deploy hook) and seed it:

   ```bash
   DATABASE_URL="<your neon url>" npm run db:migrate
   DATABASE_URL="<your neon url>" npm run db:seed
   ```

That's it — no other configuration needed.

## Notes

- Core CRUD (profile, preferences, key dates, gift log, activity log,
  restaurant favorites, store allowlist), key-date reminders, and restaurant
  discovery, all feeding one in-app notification center. No email/push
  notifications, and no automated booking — every reservation path is either
  an official embedded widget or a link out to the platform itself.
- Auth is a single shared password (`APP_PASSWORD`), checked against a signed
  session cookie. There are no user accounts.
