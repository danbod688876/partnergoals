CREATE TYPE "public"."partner_pronouns" AS ENUM('she_her', 'he_him', 'they_them');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'profile_gap';--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN "pronouns" "partner_pronouns" DEFAULT 'they_them' NOT NULL;