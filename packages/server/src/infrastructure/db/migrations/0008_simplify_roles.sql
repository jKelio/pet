-- Simplify the role model from 3 roles to 2 (admin, member).
-- Remap existing memberships before recreating the enum.
UPDATE "memberships" SET "role" = 'admin' WHERE "role" = 'club_admin';
UPDATE "memberships" SET "role" = 'member' WHERE "role" IN ('coach', 'analyst');
ALTER TYPE "public"."user_role" RENAME TO "user_role_old";
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');
ALTER TABLE "memberships" ALTER COLUMN "role" TYPE "public"."user_role" USING "role"::text::"public"."user_role";
DROP TYPE "public"."user_role_old";
-- Drop the roster table — team assignment is no longer enforced.
DROP TABLE IF EXISTS "team_assignments";
