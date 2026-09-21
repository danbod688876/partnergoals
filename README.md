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
- `/profile` — your partner's essentials (sizes, birthday, dietary notes, etc.)
- `/preferences` — likes/loves/dislikes, grouped by category
- `/dates` — birthdays, anniversaries and other key dates, sorted by what's
  coming up next; dates marked "sensitive" render quietly with no
  gift-planning framing
- `/gifts` — a log of gifts given, newest first, with an optional photo
- `/activities` — a log of things you've done together
- `/stores` — an allowlist of trusted stores/brands

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
5. After the first deploy, run the migration against your production
   database once (e.g. `DATABASE_URL=... npm run db:migrate` from your
   machine, or via a Vercel deploy hook) and seed it:

   ```bash
   DATABASE_URL="<your neon url>" npm run db:migrate
   DATABASE_URL="<your neon url>" npm run db:seed
   ```

That's it — no other configuration needed.

## Notes

- This is intentionally scoped to core CRUD: profile, preferences, key dates,
  gift log, activity log, and a store allowlist. No scheduled jobs, external
  API integrations, trip planning, notifications, or booking flows — that's
  future work.
- Auth is a single shared password (`APP_PASSWORD`), checked against a signed
  session cookie. There are no user accounts.
