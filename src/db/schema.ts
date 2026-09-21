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

export const partner = pgTable("partner", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
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
