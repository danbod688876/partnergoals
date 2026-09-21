CREATE TYPE "public"."planned_activity_status" AS ENUM('upcoming', 'done', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."planned_activity_type" AS ENUM('date_night', 'trip', 'anniversary_birthday');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'cadence_nudge';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planned_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "planned_activity_type" NOT NULL,
	"target_date" date,
	"status" "planned_activity_status" DEFAULT 'upcoming' NOT NULL,
	"notes" text,
	"linked_key_date_id" integer,
	"linked_trip_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip" (
	"id" serial PRIMARY KEY NOT NULL,
	"destination" text,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "key_date" ADD COLUMN "secondary_lead_time_days" integer;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "cadence_threshold_days" integer DEFAULT 21 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planned_activity" ADD CONSTRAINT "planned_activity_linked_key_date_id_key_date_id_fk" FOREIGN KEY ("linked_key_date_id") REFERENCES "public"."key_date"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planned_activity" ADD CONSTRAINT "planned_activity_linked_trip_id_trip_id_fk" FOREIGN KEY ("linked_trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
