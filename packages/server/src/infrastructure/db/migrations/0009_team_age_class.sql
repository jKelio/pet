ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "age_class" smallint;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teams_tenant_age_class_name_unique" ON "teams" ("tenant_id","age_class","name") WHERE "age_class" IS NOT NULL;
