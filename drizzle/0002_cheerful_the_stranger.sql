CREATE TYPE "public"."restaurant_platform" AS ENUM('opentable', 'resy', 'other');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'restaurant_surface';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'restaurant_similar';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'restaurant_opening';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorite_restaurant" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cuisine" text,
	"neighborhood" text,
	"platform" "restaurant_platform" DEFAULT 'other' NOT NULL,
	"platform_venue_id" text,
	"last_visited" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_run" (
	"name" text PRIMARY KEY NOT NULL,
	"ran_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "places_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"name" text NOT NULL,
	"cuisine" text NOT NULL,
	"city" text,
	"neighborhood" text,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "places_snapshot_place_id_unique" UNIQUE("place_id")
);
--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "favorite_restaurant_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_favorite_restaurant_id_favorite_restaurant_id_fk" FOREIGN KEY ("favorite_restaurant_id") REFERENCES "public"."favorite_restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_favorite_restaurant_id_idx" ON "notification" USING btree ("favorite_restaurant_id");