CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text,
	"actor_kind" text DEFAULT 'system',
	"verb" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"project_id" uuid,
	"summary" text,
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text,
	"message_id" text,
	"channel" text DEFAULT 'email' NOT NULL,
	"direction" text,
	"subject" text,
	"from_name" text,
	"from_email" text,
	"to_addrs" text,
	"sent_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"category" text,
	"priority" text,
	"action_required" boolean DEFAULT false NOT NULL,
	"status" text,
	"body_text" text,
	"triage" jsonb,
	"project_id" uuid,
	"project_confidence" double precision,
	"source_type" text,
	"source_path" text,
	"source_hash" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"role" text,
	"trade" text,
	"discipline" text,
	"email" text,
	"phone" text,
	"cell" text,
	"office" text,
	"website" text,
	"license_number" text,
	"license_state" text,
	"license_expiration" text,
	"insurance" text,
	"insurance_expiration" text,
	"preferred_contact" text,
	"fee" text,
	"last_contact" text,
	"is_consultant" boolean DEFAULT false NOT NULL,
	"notes" text,
	"source_type" text,
	"source_path" text,
	"source_hash" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"meeting_id" uuid,
	"project_id" uuid,
	"decided_on" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"doc_type" text,
	"revision" text,
	"status" text,
	"file_path" text,
	"sha256" text,
	"size_bytes" integer,
	"mime" text,
	"project_id" uuid,
	"file_modified_at" timestamp with time zone,
	"source_type" text,
	"source_path" text,
	"source_hash" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_tags" (
	"tag_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_key" text,
	"title" text NOT NULL,
	"body_markdown" text,
	"status" text,
	"maturity" text,
	"priority" text,
	"confidence" text,
	"domain" jsonb DEFAULT '[]'::jsonb,
	"source_reference" text,
	"source_type" text,
	"source_path" text,
	"source_hash" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"mode" text NOT NULL,
	"scope" text,
	"vault_path" text,
	"report" jsonb,
	"ok" boolean
);
--> statement-breakpoint
CREATE TABLE "knowledge_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text,
	"body_markdown" text,
	"code_name" text,
	"edition" text,
	"jurisdiction" text,
	"effective_date" text,
	"source_url" text,
	"status" text,
	"source_type" text,
	"source_path" text,
	"source_hash" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_type" text NOT NULL,
	"from_id" uuid NOT NULL,
	"to_type" text NOT NULL,
	"to_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"origin" text,
	"confidence" double precision DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"contact_id" uuid,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"date" text,
	"starts_at" timestamp with time zone,
	"project_id" uuid,
	"agenda" text,
	"follow_up" text,
	"source_type" text,
	"source_path" text,
	"source_hash" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"name" text NOT NULL,
	"status" text,
	"current_phase" text,
	"priority" text,
	"health" text,
	"project_type" text,
	"scope_of_work" text,
	"address_line" text,
	"city" text,
	"state" text,
	"zip" text,
	"client" text,
	"architect" text,
	"project_manager" text,
	"ahj" text,
	"permit_number" text,
	"permit_status" text,
	"sewer_available" text,
	"septic_system" text,
	"disciplines" jsonb DEFAULT '[]'::jsonb,
	"start_date" text,
	"target_date" text,
	"next_action" text,
	"next_action_due" text,
	"last_update" text,
	"source_type" text,
	"source_path" text,
	"source_hash" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text,
	"due_date" text,
	"completed_at" timestamp with time zone,
	"project_id" uuid,
	"source_kind" text,
	"source_entity_type" text,
	"source_entity_id" uuid,
	"source_line" integer,
	"source_type" text,
	"source_path" text,
	"source_hash" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_project_idx" ON "activity" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "activity_occurred_idx" ON "activity" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "communications_provider_key" ON "communications" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "communications_project_idx" ON "communications" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_source_key" ON "contacts" USING btree ("source_type","source_path");--> statement-breakpoint
CREATE INDEX "documents_project_idx" ON "documents" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_sha_key" ON "documents" USING btree ("sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_tags_key" ON "entity_tags" USING btree ("tag_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "entity_tags_entity_idx" ON "entity_tags" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ideas_source_key" ON "ideas" USING btree ("source_type","source_path");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_source_key" ON "knowledge_notes" USING btree ("source_type","source_path");--> statement-breakpoint
CREATE UNIQUE INDEX "links_key" ON "links" USING btree ("from_type","from_id","to_type","to_id","relation");--> statement-breakpoint
CREATE INDEX "links_from_idx" ON "links" USING btree ("from_type","from_id");--> statement-breakpoint
CREATE INDEX "links_to_idx" ON "links" USING btree ("to_type","to_id");--> statement-breakpoint
CREATE INDEX "meetings_project_idx" ON "meetings" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meetings_source_key" ON "meetings" USING btree ("source_type","source_path");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_number_key" ON "projects" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_key" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_source_key" ON "tasks" USING btree ("source_type","source_path","source_line");