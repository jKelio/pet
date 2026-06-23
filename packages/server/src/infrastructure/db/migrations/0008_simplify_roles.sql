-- Simplify the role model from 3 roles to 2 (admin, member).
-- Cast to text first so we can update values before the enum exists.
ALTER TABLE "memberships" ALTER COLUMN "role" TYPE text;
UPDATE "memberships" SET "role" = 'admin' WHERE "role" = 'club_admin';
UPDATE "memberships" SET "role" = 'member' WHERE "role" IN ('coach', 'analyst');
DROP TYPE "public"."user_role";
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');
ALTER TABLE "memberships" ALTER COLUMN "role" TYPE "public"."user_role" USING "role"::"public"."user_role";
-- Drop the roster table — team assignment is no longer enforced.
DROP TABLE IF EXISTS "team_assignments";
