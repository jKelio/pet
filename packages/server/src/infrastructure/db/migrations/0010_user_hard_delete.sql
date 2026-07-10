-- Allow hard-deleting users while keeping their authored content:
-- created_by becomes nullable and is set to NULL when the user row is deleted.
ALTER TABLE "practice_sessions" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_sessions" DROP CONSTRAINT "practice_sessions_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_recommendations" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "session_recommendations" DROP CONSTRAINT "session_recommendations_created_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "session_recommendations" ADD CONSTRAINT "session_recommendations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
