CREATE TYPE "public"."notification_type" AS ENUM('key_date_reminder');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "notification_type" NOT NULL,
	"key_date_id" integer,
	"message" text NOT NULL,
	"link" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"snoozed_until" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification" ADD CONSTRAINT "notification_key_date_id_key_date_id_fk" FOREIGN KEY ("key_date_id") REFERENCES "public"."key_date"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_key_date_id_idx" ON "notification" USING btree ("key_date_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_dismissed_idx" ON "notification" USING btree ("dismissed");