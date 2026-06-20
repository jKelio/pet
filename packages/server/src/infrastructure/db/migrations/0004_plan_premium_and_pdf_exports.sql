ALTER TYPE "public"."tenant_plan" RENAME VALUE 'enterprise' TO 'premium';--> statement-breakpoint
CREATE TABLE "pdf_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pdf_exports" ADD CONSTRAINT "pdf_exports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pdf_exports_tenant_session_period_unique" ON "pdf_exports" USING btree ("tenant_id","session_id","period");--> statement-breakpoint
CREATE INDEX "pdf_exports_tenant_period_idx" ON "pdf_exports" USING btree ("tenant_id","period");
