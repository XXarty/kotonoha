ALTER TABLE "favorites" ALTER COLUMN "item_id" SET DATA TYPE text USING "item_id"::text;--> statement-breakpoint
ALTER TABLE "user_item_progress" ALTER COLUMN "item_id" SET DATA TYPE text USING "item_id"::text;
