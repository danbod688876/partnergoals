CREATE TYPE "public"."preference_category" AS ENUM('band', 'color', 'flower', 'jewelry_style', 'food', 'hobby', 'movie', 'other');--> statement-breakpoint
CREATE TYPE "public"."preference_strength" AS ENUM('like', 'love', 'dislike');--> statement-breakpoint
CREATE TYPE "public"."recurrence" AS ENUM('annual', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."store_category" AS ENUM('clothing', 'jewelry', 'flowers', 'beauty', 'other');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity" text NOT NULL,
	"date" date NOT NULL,
	"location" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gift_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"item" text NOT NULL,
	"date_given" date NOT NULL,
	"occasion" text,
	"store_brand" text,
	"price" numeric(10, 2),
	"photo_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "key_date" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"date" date NOT NULL,
	"recurrence" "recurrence" DEFAULT 'annual' NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"lead_time_days" integer DEFAULT 14 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"birthday" date,
	"city" text,
	"neighborhood" text,
	"clothing_size" text,
	"shoe_size" text,
	"ring_size" text,
	"dietary_notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "preference" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "preference_category" NOT NULL,
	"value" text NOT NULL,
	"notes" text,
	"strength" "preference_strength" DEFAULT 'like' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "store_brand" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "store_category" DEFAULT 'other' NOT NULL,
	"url" text,
	"allowlisted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_brand_name_unique" UNIQUE("name")
);
