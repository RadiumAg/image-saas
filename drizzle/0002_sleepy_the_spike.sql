CREATE TABLE "image_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"feature_vector" json NOT NULL,
	"dimension" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_name_unique";--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_parent_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "deleted_at_expiration" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "create_at" date DEFAULT now();--> statement-breakpoint
ALTER TABLE "image_features" ADD CONSTRAINT "image_features_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_features_file_idx" ON "image_features" USING btree ("file_id");