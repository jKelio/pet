CREATE TYPE "public"."session_status" AS ENUM('draft', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."tenant_plan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('club_admin', 'coach', 'assistant', 'analyst', 'viewer');--> statement-breakpoint
CREATE TABLE "drills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"timer_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"counter_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"waste_time_data" jsonb DEFAULT '{"totalTime":0,"timeSegments":[]}'::jsonb NOT NULL,
	"action_buttons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"date" date,
	"coach_name" text DEFAULT '' NOT NULL,
	"evaluation" integer DEFAULT 0 NOT NULL,
	"athletes_count" integer DEFAULT 0 NOT NULL,
	"coaches_count" integer DEFAULT 0 NOT NULL,
	"total_time_minutes" integer DEFAULT 0 NOT NULL,
	"tracked_player_name" text DEFAULT '' NOT NULL,
	"gap_time_data" jsonb DEFAULT '{"totalTime":0,"timeSegments":[]}'::jsonb NOT NULL,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"team_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" "tenant_plan" DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"magic_link_token_hash" text,
	"token_expires_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "drills" ADD CONSTRAINT "drills_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drills_session_id_idx" ON "drills" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_tenant_unique" ON "memberships" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "memberships_tenant_id_idx" ON "memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sessions_tenant_id_idx" ON "practice_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sessions_team_id_idx" ON "practice_sessions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "sessions_created_by_idx" ON "practice_sessions" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "team_assignments_unique" ON "team_assignments" USING btree ("membership_id","team_id");--> statement-breakpoint
CREATE INDEX "teams_tenant_id_idx" ON "teams" USING btree ("tenant_id");