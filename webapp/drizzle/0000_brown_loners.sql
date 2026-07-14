CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_image_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"version" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"disabled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"item_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grammar_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"expression" text NOT NULL,
	"connection" text NOT NULL,
	"explanation_zh" text NOT NULL,
	"example_ja" text NOT NULL,
	"example_zh" text NOT NULL,
	"source_page" integer NOT NULL,
	"validation_status" text DEFAULT 'needs_review' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kana_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"hiragana" text NOT NULL,
	"katakana" text NOT NULL,
	"romaji" text NOT NULL,
	"audio_url" text,
	"row_group" text NOT NULL,
	"validation_status" text DEFAULT 'needs_review' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"source_page" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"event_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_item_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"item_id" uuid NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"correct_streak" integer DEFAULT 0 NOT NULL,
	"next_review_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocabulary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"japanese" text NOT NULL,
	"kana" text NOT NULL,
	"romaji" text NOT NULL,
	"meaning_zh" text NOT NULL,
	"meaning_en" text NOT NULL,
	"source_page" integer NOT NULL,
	"validation_status" text DEFAULT 'needs_review' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_source_id_content_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."content_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_lists" ADD CONSTRAINT "content_lists_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_entries" ADD CONSTRAINT "grammar_entries_list_id_content_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kana_entries" ADD CONSTRAINT "kana_entries_list_id_content_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_entries" ADD CONSTRAINT "vocabulary_entries_list_id_content_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."content_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "books_source_slug_unique" ON "books" USING btree ("source_id","slug");--> statement-breakpoint
CREATE INDEX "books_source_order_idx" ON "books" USING btree ("source_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "content_lists_section_slug_unique" ON "content_lists" USING btree ("section_id","slug");--> statement-breakpoint
CREATE INDEX "content_lists_section_order_idx" ON "content_lists" USING btree ("section_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_user_kind_item_unique" ON "favorites" USING btree ("user_id","kind","item_id");--> statement-breakpoint
CREATE INDEX "favorites_user_created_idx" ON "favorites" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "grammar_entries_list_order_idx" ON "grammar_entries" USING btree ("list_id","display_order");--> statement-breakpoint
CREATE INDEX "grammar_entries_public_idx" ON "grammar_entries" USING btree ("validation_status","list_id");--> statement-breakpoint
CREATE INDEX "grammar_entries_expression_idx" ON "grammar_entries" USING btree ("expression");--> statement-breakpoint
CREATE INDEX "kana_entries_list_order_idx" ON "kana_entries" USING btree ("list_id","display_order");--> statement-breakpoint
CREATE INDEX "kana_entries_public_idx" ON "kana_entries" USING btree ("validation_status","list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_book_slug_unique" ON "sections" USING btree ("book_id","slug");--> statement-breakpoint
CREATE INDEX "sections_book_order_idx" ON "sections" USING btree ("book_id","display_order");--> statement-breakpoint
CREATE INDEX "study_sessions_user_started_idx" ON "study_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_events_event_id_unique" ON "sync_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "sync_events_user_event_idx" ON "sync_events" USING btree ("user_id","event_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_item_progress_user_kind_item_unique" ON "user_item_progress" USING btree ("user_id","kind","item_id");--> statement-breakpoint
CREATE INDEX "user_item_progress_user_due_idx" ON "user_item_progress" USING btree ("user_id","next_review_at");--> statement-breakpoint
CREATE INDEX "vocabulary_entries_list_order_idx" ON "vocabulary_entries" USING btree ("list_id","display_order");--> statement-breakpoint
CREATE INDEX "vocabulary_entries_public_idx" ON "vocabulary_entries" USING btree ("validation_status","list_id");--> statement-breakpoint
CREATE INDEX "vocabulary_entries_japanese_idx" ON "vocabulary_entries" USING btree ("japanese");--> statement-breakpoint
CREATE INDEX "vocabulary_entries_kana_idx" ON "vocabulary_entries" USING btree ("kana");