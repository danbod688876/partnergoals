CREATE TYPE "public"."enjoyed_place_type" AS ENUM('hotel', 'restaurant', 'cafe', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan_item_category" AS ENUM('stay', 'eat_drink', 'explore', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan_item_status" AS ENUM('proposed', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."plan_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enjoyed_place" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "enjoyed_place_type" DEFAULT 'other' NOT NULL,
	"city" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'New plan' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"client_id" text NOT NULL,
	"category" "plan_item_category" DEFAULT 'other' NOT NULL,
	"status" "plan_item_status" DEFAULT 'proposed' NOT NULL,
	"payload_json" text NOT NULL,
	"confirmed_record_type" text,
	"confirmed_record_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"role" "plan_message_role" NOT NULL,
	"content" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_message" ADD CONSTRAINT "plan_message_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_item_plan_id_idx" ON "plan_item" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_message_plan_id_idx" ON "plan_message" USING btree ("plan_id");