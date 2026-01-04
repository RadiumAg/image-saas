ALTER TABLE "tags" ADD COLUMN "category_type" varchar(20) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "app_id" uuid;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "description" varchar(500);--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "sort" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_parent_id_tags_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tags_category_idx" ON "tags" USING btree ("category_type");--> statement-breakpoint
CREATE INDEX "tags_parent_idx" ON "tags" USING btree ("parent_id");