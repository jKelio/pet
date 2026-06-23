DO $$ BEGIN
  CREATE TYPE "public"."team_kind" AS ENUM('own', 'external');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "kind" "team_kind" NOT NULL DEFAULT 'own';--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "external_club_name" text;
