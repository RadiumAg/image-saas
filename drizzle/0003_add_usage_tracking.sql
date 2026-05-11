ALTER TABLE "user" ALTER COLUMN "plan" SET DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "usage_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "usage_storage" integer DEFAULT 0;