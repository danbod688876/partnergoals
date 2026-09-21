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
