CREATE TYPE "public"."content_type" AS ENUM('image', 'text', 'card_photo');--> statement-breakpoint
CREATE TYPE "public"."followup_status" AS ENUM('up_to_date', 'due_soon', 'overdue', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending_review', 'confirmed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."role_type" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."source_channel" AS ENUM('pwa', 'manual', 'import');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('commitment', 'reminder', 'followup');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid,
	"source_channel" "source_channel" DEFAULT 'pwa' NOT NULL,
	"content_type" "content_type" NOT NULL,
	"raw_text" text,
	"ai_summary" text,
	"extracted_fields_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"review_status" "review_status" DEFAULT 'pending_review' NOT NULL,
	"occurred_at" timestamp with time zone,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"company_name" text,
	"handles_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"referral_source_tag" text,
	"status_label" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"profile_summary" text,
	"last_contact_at" timestamp with time zone,
	"last_contact_summary" text,
	"last_contact_event_id" uuid,
	"next_followup_at" timestamp with time zone,
	"followup_status" "followup_status" DEFAULT 'unknown' NOT NULL,
	"owner_user_id" uuid,
	"created_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid,
	"source_event_id" uuid,
	"task_type" "task_type" NOT NULL,
	"description" text NOT NULL,
	"due_at" timestamp with time zone,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"created_by_user_id" uuid,
	"completed_by_user_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role_type" "role_type" DEFAULT 'owner' NOT NULL,
	"manager_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_event_id_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_event_id_idx" ON "attachments" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_storage_key_idx" ON "attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "events_party_id_idx" ON "events" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "events_review_status_idx" ON "events" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "events_source_channel_idx" ON "events" USING btree ("source_channel");--> statement-breakpoint
CREATE INDEX "events_content_type_idx" ON "events" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "events_captured_at_idx" ON "events" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX "events_occurred_at_idx" ON "events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "parties_display_name_idx" ON "parties" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "parties_company_name_idx" ON "parties" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "parties_owner_user_id_idx" ON "parties" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "parties_followup_status_idx" ON "parties" USING btree ("followup_status");--> statement-breakpoint
CREATE INDEX "parties_next_followup_at_idx" ON "parties" USING btree ("next_followup_at");--> statement-breakpoint
CREATE INDEX "tasks_party_id_idx" ON "tasks" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "tasks_source_event_id_idx" ON "tasks" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_due_at_idx" ON "tasks" USING btree ("due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_manager_user_id_idx" ON "users" USING btree ("manager_user_id");