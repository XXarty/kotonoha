ALTER TABLE "grammar_entries" ADD COLUMN "source_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_entries" ADD COLUMN "source_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "kana_entries" ADD COLUMN "source_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vocabulary_entries" ADD COLUMN "source_key" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "grammar_entries_list_source_key_unique" ON "grammar_entries" USING btree ("list_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "grammar_entries_list_source_number_unique" ON "grammar_entries" USING btree ("list_id","source_number");--> statement-breakpoint
CREATE UNIQUE INDEX "kana_entries_list_source_key_unique" ON "kana_entries" USING btree ("list_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "vocabulary_entries_list_source_key_unique" ON "vocabulary_entries" USING btree ("list_id","source_key");