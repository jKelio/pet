CREATE TYPE "public"."team_kind" AS ENUM('own', 'external');--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "kind" "team_kind" NOT NULL DEFAULT 'own';--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "external_club_name" text;
