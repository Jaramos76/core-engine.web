ALTER TABLE "tasks" ADD COLUMN "extraction_confidence" double precision;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "review_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "review_status" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "tasks_review_idx" ON "tasks" USING btree ("review_required","review_status");