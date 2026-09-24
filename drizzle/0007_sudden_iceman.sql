CREATE TYPE "public"."hotel_stay_status" AS ENUM('proposed', 'confirmed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_stay" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer,
	"destination" text NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2),
	"currency" text,
	"rating" numeric(2, 1),
	"review_count" integer,
	"booking_url" text,
	"source" text DEFAULT 'serpapi' NOT NULL,
	"status" "hotel_stay_status" DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hotel_stay" ADD CONSTRAINT "hotel_stay_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
