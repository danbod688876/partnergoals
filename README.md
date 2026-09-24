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

The nav is deliberately just three items — Planning, Upcoming, Preferences —
plus a notifications bell. Planning is the front door: `/` redirects there.

- `/login` — password gate
- `/onboarding` — shown automatically the first time you log in (before any
  partner profile exists); see below
- `/planning` — the Planning Session: a chat-based itinerary builder, and the
  home page (see below)
- `/upcoming` — everything scheduled, soonest first: key dates, planned
  activities, and trips with a future date — no calendar, just a list
- `/preferences` — the **Preferences hub**: fast chip-based preference
  entry, places you've enjoyed (hotels/restaurants/cafes), and a "More" grid
  linking out to everything else — `/profile`, `/dates`, `/gifts`,
  `/activities`, `/restaurants`, `/stores`. Those pages still exist and work
  exactly as before; they're just reached through here instead of the top
  nav.
- `/notifications` — the reminder feed (open reminders, newest first, with
  "Mark done" and "Snooze"), reached via the bell icon rather than a nav tab
- `/profile` — your partner's essentials (sizes, birthday, dietary notes, etc.)
- `/dates` — birthdays, anniversaries and other key dates, sorted by what's
  coming up next; dates marked "sensitive" render quietly with no
  gift-planning framing
- `/gifts` — a log of gifts given, newest first, with an optional photo
- `/activities` — a log of things you've done together
- `/restaurants` — favorite restaurants; each has a detail page with a
  reservation link/embed for its booking platform
- `/stores` — an allowlist of trusted stores/brands

## Onboarding

The first time you log in with no partner profile yet, you land on
`/onboarding` instead of the notification feed. After a quick name +
pronouns step, you pick one of two paths:

- **"I've already got notes on them"** — paste any freeform text (a note, a
  list, whatever) and it's sent to the Claude API to pull out structured
  fields (preferences, key dates, sizes, dietary notes) into an editable
  review screen before anything is saved. Needs `ANTHROPIC_API_KEY`; without
  it, this path shows a plain message and lets you skip straight to the
  quick-pick questions instead.
- **"Starting fresh"** — a short series of quick-pick questions, one per
  preference category (colors, flowers, bands, jewelry style, food, hobbies,
  movies), phrased using whatever pronouns you set (e.g. "What flowers does
  she love?"). Each answer saves immediately; "Skip for now" always moves on
  without one.

After that, one more screen asks **"What's the next activity you'd like to
plan?"** with three one-tap options — Anniversary/Birthday (creates a key
date with 14- and 7-day reminders pre-set), Date night (no date needed), or
Trip away (destination and dates optional) — so the Upcoming view has
something real in it from day one. Skippable like everything else.

Either path ends on a short "that's a great start" screen. Clicking through
it triggers one on-demand run of the full scan engine (the same checks the
daily cron runs) so the notification feed isn't empty on day one — you'll
see a brief loading state while it runs. Onboarding only ever asks for a
handful of things — everything else (birthday, city, sizes, dietary notes,
key dates) is filled in gradually afterward via **drip-enrichment
notifications**: the same daily cron occasionally asks one specific, small
question ("Got a sec? One more thing that'll help — what's her birthday?")
as a `profile_gap` notification in the feed, at most about once a week,
always about whatever's still missing.

The Birthday/Anniversary one-tap shortcut from onboarding is also available
any time from `/dates` — two quick-add buttons above the regular form skip
straight to just a date field.

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

Creating or editing a key date also runs this check immediately and inline
for that one date — if it's already inside its lead-time window, the
reminder fires right away instead of waiting for the next cron tick.

To run the full check manually (e.g. to test locally), hit the route with
the `CRON_SECRET` you configured:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

If `CRON_SECRET` isn't set, the route runs unauthenticated — fine for local
dev, but set it before deploying so the endpoint isn't open to anyone who
finds the URL. (There's also `/api/scan/trigger`, a POST-only route behind
the normal app login instead of `CRON_SECRET` — that's what the onboarding
finish screen calls for the one-time on-demand scan.)

## Staying in touch (cadence nudge)

The daily cron also tracks the most recent thing you did together —
whichever is more recent of a logged activity or a planned
activity/trip marked done — against a configurable threshold (default 21
days, editable at the bottom of `/notifications`). If nothing's happened or
scheduled within that window, it suggests something pulled from your
partner's hobby/food preferences as a `cadence_nudge` notification, same
dismiss/snooze pattern as everything else.

## Restaurant discovery

`/restaurants` holds your favorite spots. Each one can carry a booking
platform (OpenTable, Resy, or other) and a venue ID or URL — paste either the
platform's own ID/slug for that restaurant, or the full URL to its page on
that platform (whichever you have handy; the detail page parses an ID/slug
out of a full URL automatically, e.g. pulling `rid` out of an OpenTable link
or the venue slug out of a Resy `/venues/...` link). The detail page
(`/restaurants/[id]`) shows a reservation option built from that:

- **OpenTable**, ID resolved (from a bare ID or parsed out of a pasted URL):
  the real, current OpenTable Reservation Widget (`src/components/
  OpenTableWidget.tsx`) — a `<script>` loader injected as a child of its
  container div (verified against a real installed embed's source; no API
  key or partner approval needed, any restaurant generates this from their
  own OpenTable for Restaurants dashboard), plus a plain "Open on OpenTable"
  link as a guaranteed fallback.
- **Resy**, slug resolved (from a bare ID or parsed out of a pasted URL): an
  attempt at Resy's public button-widget embed, plus a fallback link to open
  the pasted URL (or search resy.com if only a bare ID was given).
- **A pasted URL that doesn't parse** (e.g. a bare `/r/slug` OpenTable link)
  or **platform "other" with a URL**: a direct link to that URL instead of
  guessing at a widget.
- **No venue ID at all**: a plain message pointing you to call or check the
  restaurant's own site.

Nothing here ever books anything automatically — every path either embeds
the platform's own official widget (so booking happens in their iframe, with
their own login/payment flow) or link out to their page. No API keys,
scraping, or stored credentials for either platform. (Resy's exact widget
embed syntax couldn't be verified against their live docs while building
this — if it doesn't render, the fallback link next to it always works, and
it's worth checking Resy's current widget docs to update
`src/components/BookingWidget.tsx` if needed.)

The same `OpenTableWidget` shows up a second place: in the Planning Session,
when the assistant proposes a restaurant stop whose name matches one of your
saved favorites, the card gets the real booking widget (or, for Resy/other
favorites, a link to that favorite's detail page) instead of a generic
Places-based rating card — see below.

The detail page also shows **"If [restaurant] doesn't work out"** — 3-5
nearby, similarly-rated backups pulled from Google Places (Nearby Search +
Place Details), filtered to the restaurant's own cuisine/neighborhood. The
same lookup (`src/lib/restaurant-backups.ts`) backs the `restaurant_similar`
notification below and the Planning Session's `suggest_restaurant` tool, and
is cached per neighborhood+cuisine combo for 24h in a `places_backup_cache`
table so the same combo doesn't re-hit the Places API on every page view.

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
check-ins still fire — just without the similar-restaurant bundle, opening
alerts, or restaurant-detail backups.

## Planning Session

`/planning` is a chat-based itinerary builder for when you need to turn "I
should plan something" into an actual plan, fast — and the app's home page.
It's a two-pane view: a chat on the left, and a live **"Your plan"** panel on
the right that fills in as you talk, grouped into **Stay / Eat & Drink /
Explore** sections (plus a "Plans" section for key dates and non-trip
activities that don't fit that grouping). Nothing is saved to your profile
until you explicitly confirm each item — the assistant can only *propose* a
key date, a planned activity (date night / trip / anniversary-birthday), or
a day-by-day trip itinerary item, which shows up as a card with
Confirm / Edit / Discard. Confirming one inserts it via the same actions the
regular CRUD pages use; an "Add all" button confirms everything at once. A
confirmed card stays editable afterward too — Edit on a confirmed item
updates the real record, not just the card, so changing your mind later
still works. Multiple itinerary items proposed without an existing trip get
grouped into one new trip automatically.

For a trip, the assistant is steered to ask whether it's tied to an event and
roughly how many nights, then lead with lodging. Before it has real dates, it
uses `search_hotels` for a dateless, price-free look at options (places
you've actually enjoyed staying at first, via `/preferences`'s "Places
you've enjoyed" list, falling back to a Google Places lodging search sorted
by rating). Once it has check-in/check-out dates, it prefers
`propose_hotel_stay` instead — this calls SerpApi's Google Hotels engine
server-side (`src/lib/serpapi-hotels.ts`, `SERP_API_KEY`, never exposed to
the client) and proposes the top few real, **currently-priced** candidates as
their own cards (a dedicated `hotel_stay` table, distinct from a generic
"stay" itinerary item) for you to pick from directly, rather than the
assistant choosing one to describe. When it proposes a specific restaurant,
the card gets a rating, a short description (Google's own editorial summary
when it has one), a link to reserve, and a fitting emoji — looked up live via
Google Places rather than invented — **unless** the name matches one of your
saved favorites, in which case the card gets that favorite's real booking
widget/link instead (OpenTable's widget, or a link to the favorite's detail
page for Resy/other). Every "stay" card, whichever kind, gets a distinct
accent border so lodging reads as lodging at a glance. The `suggest_restaurant`
tool works the same favorites-first pattern for a plain "where should we eat"
question that isn't part of a trip itinerary.

Every trip-related tool call (`suggest_restaurant`, `search_hotels`,
`propose_trip_itinerary_item`, `propose_hotel_stay`) takes an explicit
destination — the model is told to always pass the trip's city, not assume
the user's own. Without that, searches would quietly run against your home
city (from `/profile`) even for a trip somewhere else, which is what the
destination-aware search now specifically avoids.

The assistant is also told about places you've enjoyed before (hotels,
restaurants, cafes) and asked to reference them when relevant — a callback,
or ranking a remembered place first if a trip returns to that city — and it
proactively calls a `save_preference` tool whenever you mention a taste in
conversation (a favorite cuisine, a hobby), so it's remembered in
`/preferences` for next time without you having to add it separately. When a
lookup comes back empty, it's told to ask concisely for what it needs
(a neighborhood, a favorite cuisine) rather than explain the search mechanics.

Unlike earlier versions of this feature, the chat is **not** ephemeral: each
conversation is a named, saved **Plan** (`plan` / `plan_message` / `plan_item`
tables) — the assistant names it itself via a `set_plan_title` tool once
there's enough context (e.g. "Austin Weekend"), usually right after the first
proposal, and you can also click the title directly to rename it yourself.
The "My plans" button lets you switch between in-progress plans or start a
new one, and navigating away and coming back resumes exactly where you left
off — transcript, proposed cards, and confirmed status all included. Needs
`ANTHROPIC_API_KEY`; without it, the chat shows a plain "isn't configured
yet" message instead of failing silently (a draft plan still gets created
either way).

Two entry points lead here beyond just visiting `/planning` directly:

- The **"Talk it through"** option alongside the other three quick-plan
  choices, wherever `PlanNextActivityPrompt` shows up (onboarding's
  activity-planning step, and `/upcoming`'s empty state / "+ plan something
  else").
- The **urgency branch**: if you enter a birthday/anniversary date that's
  within 14 days, the quick date-only save is skipped in favor of jumping
  straight into a Planning Session, pre-seeded with that occasion and date
  as opening context — the assistant opens by acknowledging it and
  proposing something concrete right away instead of asking what you want
  first.

## Preferences hub

`/preferences` leads with fast entry: every preference category shows as a
row of chips (existing preferences) plus a trailing input — type something
and hit Enter to save it immediately at "like" strength, click a chip's × to
remove it. A collapsed "Add with more detail" section underneath still
supports setting strength (like/love/dislike) and notes when that's worth
the extra step. Below that, **"Places you've enjoyed"** is a simple log of
hotels/restaurants/cafes you've actually liked (`enjoyed_place` table,
distinct from `/restaurants`'s reservation-focused favorites list) — this is
what the Planning Session's hotel suggestions and preference callbacks pull
from. A "More" grid at the bottom links out to Profile, Key Dates, Gift Log,
Activities, Restaurants, and Stores.

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
2. Add the **Neon** integration (Storage tab) to provision Postgres. Note:
   Vercel's native Neon integration names its connection string variable
   `<project-name>_DATABASE_URL` (e.g. `partnergoals_DATABASE_URL`), not
   plain `DATABASE_URL` — and marks it read-only in the dashboard since it's
   synced from the connected database. The app checks for that prefixed name
   first and falls back to plain `DATABASE_URL` (see `src/db/index.ts`), so
   either works; you don't need to manually reconcile them. If you'd rather
   set your own Neon connection string instead of using the integration,
   just add a plain `DATABASE_URL` environment variable yourself.
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
7. (Optional, for the "paste your notes" onboarding path and the Planning
   Session chat) Set `ANTHROPIC_API_KEY` from https://console.anthropic.com.
8. (Optional, for real-priced hotel proposals in the Planning Session) Set
   `SERP_API_KEY` from https://serpapi.com. Without it, the assistant falls
   back to Places-based lodging suggestions with no pricing.
9. After the first deploy, run the migration against your production
   database once (e.g. `DATABASE_URL=... npm run db:migrate` from your
   machine, or via a Vercel deploy hook) and seed it:

   ```bash
   DATABASE_URL="<your neon url>" npm run db:migrate
   DATABASE_URL="<your neon url>" npm run db:seed
   ```

That's it — no other configuration needed.

## Notes

- Core CRUD (profile, preferences, key dates, gift log, activity log,
  restaurant favorites, store allowlist), an onboarding flow, key-date
  reminders, restaurant discovery, and a chat-based Planning Session, all
  feeding one in-app notification center (or, for Planning Session, one
  confirm-before-save "Your plan" panel). No email/push notifications, and
  no automated booking — every reservation path is either an official
  embedded widget or a link out to the platform itself.
- Auth is a single shared password (`APP_PASSWORD`), checked against a signed
  session cookie. There are no user accounts.
- Copy throughout (onboarding, empty states, notifications) is meant to read
  warm and plain-spoken rather than clinical, and adapts to whatever
  pronouns you set for your partner during onboarding.
