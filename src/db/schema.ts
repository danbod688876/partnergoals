import {
  pgTable,
  serial,
  text,
  date,
  boolean,
  integer,
  numeric,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const preferenceCategoryEnum = pgEnum("preference_category", [
  "band",
  "color",
  "flower",
  "jewelry_style",
  "food",
  "hobby",
  "movie",
  "other",
]);

export const preferenceStrengthEnum = pgEnum("preference_strength", [
  "like",
  "love",
  "dislike",
]);

export const recurrenceEnum = pgEnum("recurrence", ["annual", "one_time"]);

export const storeCategoryEnum = pgEnum("store_category", [
  "clothing",
  "jewelry",
  "flowers",
  "beauty",
  "other",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "key_date_reminder",
  "restaurant_surface",
  "restaurant_similar",
  "restaurant_opening",
  "profile_gap",
  "cadence_nudge",
]);

export const restaurantPlatformEnum = pgEnum("restaurant_platform", [
  "opentable",
  "resy",
  "other",
]);

export const partnerPronounsEnum = pgEnum("partner_pronouns", [
  "she_her",
  "he_him",
  "they_them",
]);

export const partner = pgTable("partner", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  pronouns: partnerPronounsEnum("pronouns").notNull().default("they_them"),
  birthday: date("birthday"),
  city: text("city"),
  neighborhood: text("neighborhood"),
  clothingSize: text("clothing_size"),
  shoeSize: text("shoe_size"),
  ringSize: text("ring_size"),
  dietaryNotes: text("dietary_notes"),
  // How many days without an activity/date together before the cadence-nudge
  // scan suggests something — configurable from the Notifications page.
  cadenceThresholdDays: integer("cadence_threshold_days").notNull().default(21),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const preference = pgTable("preference", {
  id: serial("id").primaryKey(),
  category: preferenceCategoryEnum("category").notNull(),
  value: text("value").notNull(),
  notes: text("notes"),
  strength: preferenceStrengthEnum("strength").notNull().default("like"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const keyDate = pgTable("key_date", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  date: date("date").notNull(),
  recurrence: recurrenceEnum("recurrence").notNull().default("annual"),
  sensitive: boolean("sensitive").notNull().default(false),
  leadTimeDays: integer("lead_time_days").notNull().default(14),
  // Optional second reminder threshold (e.g. the Birthday/Anniversary
  // one-tap quick-add sets 14 + 7 so you get nudged twice as it approaches).
  // Null for dates added through the regular form, which only ever get one.
  secondaryLeadTimeDays: integer("secondary_lead_time_days"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const giftLog = pgTable("gift_log", {
  id: serial("id").primaryKey(),
  item: text("item").notNull(),
  dateGiven: date("date_given").notNull(),
  occasion: text("occasion"),
  storeBrand: text("store_brand"),
  price: numeric("price", { precision: 10, scale: 2 }),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  activity: text("activity").notNull(),
  date: date("date").notNull(),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storeBrand = pgTable("store_brand", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: storeCategoryEnum("category").notNull().default("other"),
  url: text("url"),
  allowlisted: boolean("allowlisted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const favoriteRestaurant = pgTable("favorite_restaurant", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cuisine: text("cuisine"),
  neighborhood: text("neighborhood"),
  platform: restaurantPlatformEnum("platform").notNull().default("other"),
  // Either a bare platform ID/slug (e.g. an OpenTable "rid") or a full URL to
  // the restaurant's page on that platform — a full URL is always safest,
  // especially for Resy where the venue URL isn't a single simple ID.
  platformVenueId: text("platform_venue_id"),
  lastVisited: date("last_visited"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rolling snapshot of nearby places seen via Google Places Nearby Search,
// used to diff month over month for the restaurant_opening notification.
// "New" just means "not in this table yet" — since the scan only runs
// monthly (gated by job_run), that's equivalent to "new since last month".
export const placesSnapshot = pgTable("places_snapshot", {
  id: serial("id").primaryKey(),
  placeId: text("place_id").notNull().unique(),
  name: text("name").notNull(),
  cuisine: text("cuisine").notNull(),
  city: text("city"),
  neighborhood: text("neighborhood"),
  firstSeen: timestamp("first_seen").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
});

// Tracks the last run of named background jobs that shouldn't run on every
// daily cron tick (e.g. the monthly new-restaurant scan), so cadence is
// self-healing across missed/delayed cron invocations instead of relying on
// an exact day-of-month match.
export const jobRun = pgTable("job_run", {
  name: text("name").primaryKey(),
  ranAt: timestamp("ran_at").notNull(),
});

// Minimal trip stub — just enough to anchor a PlannedActivity and the
// Upcoming view. The full day-by-day itinerary planner is a later phase.
export const trip = pgTable("trip", {
  id: serial("id").primaryKey(),
  destination: text("destination"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const plannedActivityTypeEnum = pgEnum("planned_activity_type", [
  "date_night",
  "trip",
  "anniversary_birthday",
]);

export const plannedActivityStatusEnum = pgEnum("planned_activity_status", [
  "upcoming",
  "done",
  "skipped",
]);

export const plannedActivity = pgTable("planned_activity", {
  id: serial("id").primaryKey(),
  type: plannedActivityTypeEnum("type").notNull(),
  targetDate: date("target_date"),
  status: plannedActivityStatusEnum("status").notNull().default("upcoming"),
  notes: text("notes"),
  linkedKeyDateId: integer("linked_key_date_id").references(() => keyDate.id, {
    onDelete: "set null",
  }),
  linkedTripId: integer("linked_trip_id").references(() => trip.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Day-by-day itinerary items for a Trip, proposed via the Planning Session's
// propose_trip_itinerary_item tool (or added directly later). A trip without
// any of these is still valid — the itinerary is optional detail, not a
// requirement to have a Trip at all.
export const tripItineraryItem = pgTable("trip_itinerary_item", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trip.id, { onDelete: "cascade" }),
  day: integer("day").notNull(),
  time: text("time"),
  activity: text("activity").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Short-lived cache of Google Places "backup restaurant" results, keyed by
// neighborhood+cuisine, so the same combo doesn't hit the Places API on
// every page view. Read as stale after PLACES_BACKUP_CACHE_TTL_HOURS (see
// src/lib/restaurant-backups.ts) rather than deleted outright.
export const placesBackupCache = pgTable("places_backup_cache", {
  cacheKey: text("cache_key").primaryKey(),
  resultsJson: text("results_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A named, saveable Planning Session draft — lets you have several
// in-progress conversations (e.g. "Vancouver weekend" and "Mom's birthday")
// and resume any of them instead of losing everything on navigation.
export const plan = pgTable("plan", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("New plan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const planMessageRoleEnum = pgEnum("plan_message_role", ["user", "assistant"]);

// Persisted chat transcript for a Plan. "hidden" mirrors the client's
// synthetic urgency-branch kickoff message, which is sent to the model but
// never rendered.
export const planMessage = pgTable(
  "plan_message",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    role: planMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("plan_message_plan_id_idx").on(table.planId)]
);

export const planItemStatusEnum = pgEnum("plan_item_status", ["proposed", "confirmed"]);

// "other" covers key dates / non-trip planned activities, which don't fit
// a Stay/Eat/Explore itinerary grouping.
export const planItemCategoryEnum = pgEnum("plan_item_category", [
  "stay",
  "eat_drink",
  "explore",
  "other",
]);

// A card in the "Your plan" panel — proposed by the assistant, confirmed (or
// not) by the user. payloadJson holds the full ProposedItem shape so an
// edited-but-unconfirmed item survives a resumed session; confirmedRecordType
// / confirmedRecordId point at the real row once Confirm has been pressed, so
// a later edit can update that row directly instead of re-creating it.
export const planItem = pgTable(
  "plan_item",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    category: planItemCategoryEnum("category").notNull().default("other"),
    status: planItemStatusEnum("status").notNull().default("proposed"),
    payloadJson: text("payload_json").notNull(),
    confirmedRecordType: text("confirmed_record_type"),
    confirmedRecordId: integer("confirmed_record_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("plan_item_plan_id_idx").on(table.planId)]
);

export const enjoyedPlaceTypeEnum = pgEnum("enjoyed_place_type", [
  "hotel",
  "restaurant",
  "cafe",
  "other",
]);

// Places the partner has actually enjoyed (distinct from favorite_restaurant,
// which is about reservations) — the Planning Session checks these first and
// references them ("similar to the place you stayed at in Austin") before
// falling back to a cold Places search.
export const enjoyedPlace = pgTable("enjoyed_place", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: enjoyedPlaceTypeEnum("type").notNull().default("other"),
  city: text("city"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notification = pgTable(
  "notification",
  {
    id: serial("id").primaryKey(),
    type: notificationTypeEnum("type").notNull(),
    keyDateId: integer("key_date_id").references(() => keyDate.id, {
      onDelete: "cascade",
    }),
    favoriteRestaurantId: integer("favorite_restaurant_id").references(
      () => favoriteRestaurant.id,
      { onDelete: "cascade" }
    ),
    message: text("message").notNull(),
    link: text("link"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    dismissed: boolean("dismissed").notNull().default(false),
    snoozedUntil: timestamp("snoozed_until"),
  },
  (table) => [
    index("notification_key_date_id_idx").on(table.keyDateId),
    index("notification_favorite_restaurant_id_idx").on(table.favoriteRestaurantId),
    index("notification_dismissed_idx").on(table.dismissed),
  ]
);
