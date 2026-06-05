-- Reduce the role model from 5 roles to 3 (club_admin, coach, analyst).
-- Remap any memberships still using a removed role before recreating the enum.
UPDATE "memberships" SET "role" = 'coach' WHERE "role" = 'assistant';--> statement-breakpoint
UPDATE "memberships" SET "role" = 'analyst' WHERE "role" = 'viewer';--> statement-breakpoint
ALTER TYPE "public"."user_role" RENAME TO "user_role_old";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('club_admin', 'coach', 'analyst');--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "role" TYPE "public"."user_role" USING "role"::text::"public"."user_role";--> statement-breakpoint
DROP TYPE "public"."user_role_old";
