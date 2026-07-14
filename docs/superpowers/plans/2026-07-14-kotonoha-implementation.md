# KOTONOHA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build, populate, test, publish, and deploy the KOTONOHA Japanese vocabulary and grammar learning site defined in docs/PRD.md.

**Architecture:** A Next.js 16 App Router application lives in webapp and uses Server Components for public content, small Client Components for study interactions, Better Auth for identity, and one Neon PostgreSQL database with Drizzle for auth tables, durable content, and progress. Original PDFs remain local-only; reproducible extraction scripts create manifests and load reviewed records directly into Neon.

**Tech Stack:** Next.js 16.1+, React 19.2.4+, TypeScript, Tailwind CSS 4, Vitest, Playwright, Better Auth 1.6.23+, Neon PostgreSQL, Drizzle ORM, Vercel Functions, Python 3, Poppler, Tesseract OCR, MarianMT, GitHub, Vercel.

## Global Constraints

- Use the App Router under webapp/src/app.
- Require Node.js 20.19+, 22.13+, or 24+ as enforced by webapp/package.json and webapp/.npmrc; require Next.js 16.1+ and React 19.2.4+.
- Initialize database and Better Auth server clients lazily so next build does not evaluate missing runtime credentials.
- Revalidate authorization inside Server Components, Server Actions, and Route Handlers; proxy.ts is never the sole authorization gate.
- Never commit source PDFs, OCR work files, database credentials, Auth secrets, or full derived book content.
- Keep DK and Teikyo source records removable through content_sources.enabled.
- Compute the daily word in the Asia/Hong_Kong calendar and keep it stable for the entire local day.
- Preserve the approved cool-paper editorial design, mineral-blue/celadon/lacquer-red tokens, subtle washi and susuki background, and reduced-motion behavior.
- Publish only validated records; needs_review records stay hidden.
- Use tests first for domain rules and mutations, and run the production build before deployment.

---

## File Map

### Application foundation

- webapp/package.json: scripts and dependencies.
- webapp/src/app/layout.tsx: fonts, metadata, and application shell.
- webapp/src/app/globals.css: design tokens, responsive layout, and motion.
- webapp/src/components/site-header.tsx: global navigation.
- webapp/src/components/specimen-strip.tsx: daily-word signature component.
- webapp/src/components/background-atmosphere.tsx: accessible decorative asset wrapper.

### Domain and data

- webapp/src/lib/content/types.ts: shared content types.
- webapp/src/lib/study/review.ts: deterministic review scheduling.
- webapp/src/lib/study/daily-word.ts: Hong Kong daily-word selection.
- webapp/src/lib/study/merge-progress.ts: local/cloud merge rules.
- webapp/src/lib/db/schema.ts: Drizzle schema.
- webapp/src/lib/db/client.ts: lazy Neon connection.
- webapp/src/lib/db/queries.ts: public content reads filtered by enabled sources.
- webapp/src/lib/auth/server.ts: lazy Better Auth server configuration backed by Neon PostgreSQL.
- webapp/src/lib/auth/client.ts: Better Auth React client.
- webapp/src/lib/sync/offline-store.ts: browser pending-event storage.
- webapp/src/lib/sync/sync-client.ts: idempotent progress synchronization.

### Routes

- webapp/src/app/page.tsx: home.
- webapp/src/app/vocabulary/**: word-book, DK, list, and JLPT routes.
- webapp/src/app/grammar/**: level, kana, and grammar-detail routes.
- webapp/src/app/review/page.tsx: mixed review queue.
- webapp/src/app/search/page.tsx: cross-content search.
- webapp/src/app/profile/page.tsx: account progress and favorites.
- webapp/src/app/sign-in/page.tsx: email/password entry.
- webapp/src/app/api/auth/[...path]/route.ts: Better Auth Next.js handler.
- webapp/src/app/api/sync/route.ts: authenticated progress event endpoint.

### Content pipeline

- scripts/content/models.py: validated extraction records.
- scripts/content/extract_dk.py: DK page and list extraction.
- scripts/content/extract_grammar.py: Teikyo table extraction.
- scripts/content/translate_zh.py: local English-to-Chinese machine translation.
- scripts/content/build_manifest.py: hashes, counts, and review statistics.
- scripts/content/import_to_neon.py: reviewed-record database loader.
- scripts/content/requirements.txt: pinned extraction dependencies.
- tests/content/**: page-fixture and manifest tests.

---

### Task 1: Scaffold the Next.js application and test harness

**Files:**
- Create: webapp Next.js scaffold.
- Modify: webapp/package.json
- Create: webapp/vitest.config.ts
- Create: webapp/src/test/setup.ts
- Create: webapp/src/app/page.test.tsx
- Modify: .gitignore

**Interfaces:**
- Consumes: Node.js 20.19+, 22.13+, or 24+ and npm.
- Produces: npm scripts test, test:watch, test:e2e, typecheck, db:generate, db:migrate, db:seed, and a buildable App Router shell.

- [ ] **Step 1: Scaffold the application**

Run:

~~~bash
npx create-next-app@latest webapp --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
~~~

Expected: webapp/package.json exists and the generated app uses src/app.

- [ ] **Step 2: Install runtime and test dependencies**

Run:

~~~bash
cd webapp
npm install drizzle-orm pg @vercel/functions better-auth@^1.6.23 lucide-react zod idb-keyval clsx
npm install -D drizzle-kit @types/pg vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test tsx
~~~

Expected: package-lock.json records all packages without audit-blocking install errors.

- [ ] **Step 3: Add test scripts and Vitest configuration**

Set the package scripts to:

~~~json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx scripts/seed.ts"
  }
}
~~~

Create webapp/vitest.config.ts:

~~~ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
~~~

Create webapp/src/test/setup.ts:

~~~ts
import "@testing-library/jest-dom/vitest";
~~~

- [ ] **Step 4: Write and run the scaffold smoke test**

Create webapp/src/app/page.test.tsx:

~~~tsx
import { render, screen } from "@testing-library/react";
import Home from "./page";

it("renders the KOTONOHA home heading", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: /ことのは/i })).toBeVisible();
});
~~~

Run:

~~~bash
npm test -- src/app/page.test.tsx
~~~

Expected: FAIL because the generated page does not contain the KOTONOHA heading.

- [ ] **Step 5: Replace the generated page with the minimal passing shell**

Use:

~~~tsx
export default function Home() {
  return (
    <main>
      <h1>ことのは / KOTONOHA</h1>
    </main>
  );
}
~~~

Run:

~~~bash
npm test -- src/app/page.test.tsx
npm run typecheck
~~~

Expected: one passing test and no TypeScript errors.

- [ ] **Step 6: Commit**

~~~bash
git add .gitignore webapp
git commit -m "chore: scaffold KOTONOHA web app"
~~~

---

### Task 2: Implement deterministic study-domain rules

**Files:**
- Create: webapp/src/lib/content/types.ts
- Create: webapp/src/lib/study/daily-word.ts
- Create: webapp/src/lib/study/daily-word.test.ts
- Create: webapp/src/lib/study/review.ts
- Create: webapp/src/lib/study/review.test.ts
- Create: webapp/src/lib/study/merge-progress.ts
- Create: webapp/src/lib/study/merge-progress.test.ts

**Interfaces:**
- Produces: ContentItemId, UserItemProgress, ReviewRating, getHongKongDateKey(), selectDailyWord(), calculateNextReview(), and mergeProgress().
- Consumes: no framework or database code.

- [ ] **Step 1: Define shared types**

Create webapp/src/lib/content/types.ts:

~~~ts
export type ContentKind = "vocabulary" | "grammar" | "kana";
export type ReviewRating = "forgot" | "unsure" | "known";

export interface UserItemProgress {
  itemId: string;
  kind: ContentKind;
  status: "new" | "learning" | "reviewing" | "mastered";
  reviewCount: number;
  correctStreak: number;
  nextReviewAt: string;
  lastReviewedAt: string;
  updatedAt: string;
}

export interface DailyWordCandidate {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  meaningZh: string;
  meaningEn: string;
  sourceTitle: string;
}
~~~

- [ ] **Step 2: Write failing daily-word tests**

~~~ts
import { describe, expect, it } from "vitest";
import { getHongKongDateKey, selectDailyWord } from "./daily-word";

const words = [{ id: "b" }, { id: "a" }, { id: "c" }];

describe("daily word", () => {
  it("uses the Hong Kong calendar", () => {
    expect(getHongKongDateKey(new Date("2026-07-14T15:59:59Z"))).toBe("2026-07-14");
    expect(getHongKongDateKey(new Date("2026-07-14T16:00:00Z"))).toBe("2026-07-15");
  });

  it("is stable for a date and independent of input order", () => {
    expect(selectDailyWord(words, "2026-07-14")).toEqual(
      selectDailyWord([...words].reverse(), "2026-07-14"),
    );
  });
});
~~~

Run: npm test -- src/lib/study/daily-word.test.ts  
Expected: FAIL because daily-word.ts does not exist.

- [ ] **Step 3: Implement daily-word selection**

~~~ts
export function getHongKongDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function hashDate(value: string): number {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}

export function selectDailyWord<T extends { id: string }>(
  candidates: readonly T[],
  dateKey: string,
): T | null {
  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.length === 0 ? null : sorted[hashDate(dateKey) % sorted.length];
}
~~~

- [ ] **Step 4: Write failing review and merge tests**

~~~ts
import { expect, it } from "vitest";
import { calculateNextReview } from "./review";

it("resets forgotten items to one day", () => {
  const result = calculateNextReview(
    { reviewCount: 4, correctStreak: 3 },
    "forgot",
    new Date("2026-07-14T00:00:00Z"),
  );
  expect(result.correctStreak).toBe(0);
  expect(result.nextReviewAt).toBe("2026-07-15T00:00:00.000Z");
});

it("extends known items through the configured intervals", () => {
  const result = calculateNextReview(
    { reviewCount: 2, correctStreak: 2 },
    "known",
    new Date("2026-07-14T00:00:00Z"),
  );
  expect(result.correctStreak).toBe(3);
  expect(result.nextReviewAt).toBe("2026-07-28T00:00:00.000Z");
});
~~~

Create merge-progress.test.ts with a local newer record and assert mergeProgress returns the newer lastReviewedAt, maximum reviewCount, and a true favorite flag.

- [ ] **Step 5: Implement review and merge functions**

Use intervals 1, 3, 7, 14, and 30:

~~~ts
import type { ReviewRating, UserItemProgress } from "@/lib/content/types";

const KNOWN_INTERVALS = [7, 14, 30] as const;

export function calculateNextReview(
  current: Pick<UserItemProgress, "reviewCount" | "correctStreak">,
  rating: ReviewRating,
  now = new Date(),
) {
  const correctStreak = rating === "forgot" ? 0 : current.correctStreak + 1;
  const days =
    rating === "forgot"
      ? 1
      : rating === "unsure"
        ? 3
        : KNOWN_INTERVALS[Math.min(correctStreak - 1, KNOWN_INTERVALS.length - 1)];
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + days);
  return {
    reviewCount: current.reviewCount + 1,
    correctStreak,
    nextReviewAt: next.toISOString(),
  };
}
~~~

Implement mergeProgress with field-specific rules from PRD section 8 and stable updatedAt comparison.

- [ ] **Step 6: Verify and commit**

Run:

~~~bash
npm test -- src/lib/study
npm run typecheck
~~~

Expected: all domain tests pass.

~~~bash
git add webapp/src/lib
git commit -m "feat: add deterministic study rules"
~~~

---

### Task 3: Define the Neon database schema and lazy connection

**Files:**
- Create: webapp/src/lib/db/schema.ts
- Create: webapp/src/lib/db/client.ts
- Create: webapp/src/lib/db/queries.ts
- Create: webapp/drizzle.config.ts
- Create: webapp/.env.example
- Create: webapp/drizzle/**
- Create: webapp/src/lib/db/schema.test.ts

**Interfaces:**
- Produces: getDb(), Drizzle tables, getDailyWordCandidates(), getVocabularyBooks(), getDkCategory(), getGrammarLevel(), searchContent(), and getReviewQueue().
- Consumes: ContentKind and Better Auth user IDs stored in Neon PostgreSQL.

- [ ] **Step 1: Write schema contract tests**

Test that contentSources contains enabled, vocabularyEntries contains sourcePage and validationStatus, userItemProgress has a composite user/item uniqueness index, and syncEvents has a unique event ID.

Run: npm test -- src/lib/db/schema.test.ts  
Expected: FAIL because schema.ts does not exist.

- [ ] **Step 2: Implement the Drizzle schema**

Create application-owned tables with UUID primary keys and these required columns. Store Better Auth user IDs in text columns on progress, favorites, sessions, and sync rows so their type matches the generated Better Auth user table:

~~~ts
export const contentSources = pgTable("content_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  version: text("version"),
  enabled: boolean("enabled").default(true).notNull(),
  disabledReason: text("disabled_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vocabularyEntries = pgTable("vocabulary_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id").notNull().references(() => contentLists.id),
  japanese: text("japanese").notNull(),
  kana: text("kana").notNull(),
  romaji: text("romaji").notNull(),
  meaningZh: text("meaning_zh").notNull(),
  meaningEn: text("meaning_en").notNull(),
  sourcePage: integer("source_page").notNull(),
  validationStatus: text("validation_status").default("needs_review").notNull(),
});
~~~

Add books, sections, contentLists, grammarEntries, kanaEntries, userItemProgress, favorites, studySessions, and syncEvents with foreign keys and indexes described in PRD section 9.

- [ ] **Step 3: Implement build-safe lazy database initialization**

~~~ts
import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;
let database: NodePgDatabase<typeof schema> | undefined;

export function getDb() {
  if (!database) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured");
    pool = new Pool({ connectionString, max: 5 });
    attachDatabasePool(pool);
    database = drizzle({ client: pool, schema });
  }
  return database;
}
~~~

- [ ] **Step 4: Implement enabled-source queries**

Every public query must join contentSources and require both enabled = true and validationStatus = published. Export typed query functions rather than using getDb directly in pages.

- [ ] **Step 5: Configure and generate migrations**

Create .env.example with names only:

~~~dotenv
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
~~~

Run:

~~~bash
npm run db:generate
npm test -- src/lib/db/schema.test.ts
npm run typecheck
~~~

Expected: a SQL migration is generated and tests pass without connecting to Neon.

- [ ] **Step 6: Commit**

~~~bash
git add webapp/src/lib/db webapp/drizzle webapp/drizzle.config.ts webapp/.env.example
git commit -m "feat: define Neon content and progress schema"
~~~

---

### Task 4: Integrate Better Auth on Neon PostgreSQL with server-side authorization

**Files:**
- Create: webapp/src/lib/auth/server.ts
- Create: webapp/src/lib/auth/client.ts
- Create: webapp/src/lib/db/auth-schema.ts
- Create: webapp/src/app/api/auth/[...path]/route.ts
- Create: webapp/src/app/sign-in/page.tsx
- Create: webapp/src/components/auth-form.tsx
- Create: webapp/src/proxy.ts
- Create: webapp/src/app/profile/page.tsx
- Create: webapp/src/lib/auth/require-user.ts
- Test: webapp/src/lib/auth/require-user.test.ts

**Interfaces:**
- Produces: getAuth(), authClient, Better Auth Drizzle tables/migration, requireUser(), GET/POST handlers, and protected profile rendering.
- Consumes: DATABASE_URL, BETTER_AUTH_URL (or NEXT_PUBLIC_APP_URL), and a stable 32+ character BETTER_AUTH_SECRET.

- [ ] **Step 1: Write a failing authorization test**

Mock `getAuth().api.getSession({ headers })` returning no user and assert requireUser() throws an UnauthorizedError; return a session user and assert the exact Better Auth user ID is returned.

- [ ] **Step 2: Configure lazy Better Auth with the Neon Drizzle layer**

~~~ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

let authInstance: ReturnType<typeof betterAuth> | undefined;

export function getAuth() {
  if (!authInstance) {
    const secret = process.env.BETTER_AUTH_SECRET;
    const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
    if (!baseURL) throw new Error("BETTER_AUTH_URL is not configured");
    authInstance = betterAuth({
      database: drizzleAdapter(getDb(), { provider: "pg", schema }),
      secret,
      baseURL,
      emailAndPassword: { enabled: true },
    });
  }
  return authInstance;
}
~~~

Generate the Better Auth Drizzle tables into `src/lib/db/auth-schema.ts`, export them through the Drizzle schema, include them in `drizzle.config.ts`, and run `npm run db:generate` so user/session/account/verification tables are migrated with the application. Generation may use configured local credentials, but committed runtime modules must keep getAuth() lazy.

Wrap the handler inside exported async route functions so environment access occurs only at request time:

~~~ts
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";

export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}
~~~

In `requireUser()`, call `getAuth().api.getSession({ headers: await headers() })` and return `session.user.id`; repeat this server-side validation inside every protected page, Server Action, mutation, and sync handler. Configure `src/proxy.ts` only for optimistic redirects and never treat it as the authorization boundary.

- [ ] **Step 3: Add the client and email/password form**

~~~ts
"use client";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});
~~~

The form validates email with Zod, requires an eight-character password, exposes sign-in and sign-up modes, and maps Auth errors to a concise Chinese message.

- [ ] **Step 4: Verify**

Run:

~~~bash
npm test -- src/lib/auth
npm run typecheck
npm run build
~~~

Expected: authorization tests pass and build completes even when Auth runtime values are absent during module evaluation.

- [ ] **Step 5: Commit**

~~~bash
git add webapp/src/lib/auth webapp/src/lib/db/auth-schema.ts webapp/src/lib/db/schema.ts webapp/drizzle webapp/drizzle.config.ts webapp/src/app/api/auth webapp/src/app/sign-in webapp/src/app/profile webapp/src/components/auth-form.tsx webapp/src/proxy.ts
git commit -m "feat: integrate Better Auth on Neon"
~~~

---

### Task 5: Build the reproducible PDF content pipeline

**Files:**
- Create: scripts/content/requirements.txt
- Create: scripts/content/models.py
- Create: scripts/content/extract_dk.py
- Create: scripts/content/extract_grammar.py
- Create: scripts/content/translate_zh.py
- Create: scripts/content/build_manifest.py
- Create: scripts/content/import_to_neon.py
- Create: tests/content/test_models.py
- Create: tests/content/test_manifest.py
- Create: tests/content/fixtures/**
- Modify: .gitignore

**Interfaces:**
- Produces: private work/content/dk.jsonl, grammar.jsonl, reviewed.jsonl, manifest.json, and idempotent Neon inserts.
- Consumes: the two local PDF paths, pdftoppm, Tesseract with jpn/chi_sim/eng language packs, and DATABASE_URL.

- [ ] **Step 1: Pin Python dependencies and write record validation tests**

requirements.txt:

~~~text
pydantic==2.11.7
pdfplumber==0.11.7
pypdf==5.8.0
Pillow==11.3.0
psycopg[binary]==3.2.9
transformers==4.53.2
sentencepiece==0.2.0
torch==2.7.1
pytest==8.4.1
~~~

The tests must reject blank Japanese, kana, English meaning, source page, or unrecognized validation status.

- [ ] **Step 2: Implement validated extraction models**

~~~py
from typing import Literal
from pydantic import BaseModel, Field

class RawVocabularyRecord(BaseModel):
    source_slug: str
    category: str
    list_name: str
    japanese: str = Field(min_length=1)
    kana: str = Field(min_length=1)
    romaji: str = Field(min_length=1)
    meaning_en: str = Field(min_length=1)
    meaning_zh: str = ""
    source_page: int = Field(gt=0)
    confidence: float = Field(ge=0, le=1)
    validation_status: Literal["needs_review", "published"]

class VocabularyRecord(RawVocabularyRecord):
    meaning_zh: str = Field(min_length=1)

class GrammarRecord(BaseModel):
    source_slug: str
    source_number: int = Field(ge=1, le=228)
    pattern: str = Field(min_length=1)
    explanation_zh: str = Field(min_length=1)
    example_jp: str = Field(min_length=1)
    example_zh: str = ""
    source_page: int = Field(gt=0)
    confidence: float = Field(ge=0, le=1)
    validation_status: Literal["needs_review", "published"]
~~~

- [ ] **Step 3: Install and verify OCR language packs**

Run with approval because Homebrew writes outside the workspace:

~~~bash
brew install tesseract tesseract-lang
tesseract --list-langs
~~~

Expected: jpn, chi_sim, and eng appear in the language list.

- [ ] **Step 4: Implement DK extraction**

Render pages at 300 DPI. Use the PDF text layer for romaji and English, Tesseract for Japanese glyphs, and the page 8-9 table of contents for category/list page boundaries. Normalize Unicode with NFKC, preserve long-vowel macrons, and flag records below 0.92 OCR confidence or missing field alignment.

The CLI contract is:

~~~bash
python scripts/content/extract_dk.py \
  --pdf "词汇/日常生活/(DK Visual Dictionaries) DK Publishing - Japanese  English Bilingual Visual Dictionary (DK Visual Dictionaries)-DK Adult (2011).pdf" \
  --output work/content/dk-raw.jsonl
~~~

- [ ] **Step 5: Implement Teikyo table extraction**

Render pages 2-16 at 350 DPI, OCR each table row with Japanese and simplified-Chinese languages, map the printed numbers 1-228, and fail the run when any number is duplicated or missing.

The CLI contract is:

~~~bash
python scripts/content/extract_grammar.py \
  --pdf "语法/初级/日语初级语法汇总｜帝京日语.pdf" \
  --output work/content/grammar-raw.jsonl
~~~

- [ ] **Step 6: Implement local Chinese translation and manifesting**

translate_zh.py loads Helsinki-NLP/opus-mt-en-zh once, translates only missing Chinese meanings in batches of 32, marks them machine_translated, and never overwrites a manually reviewed value.

build_manifest.py calculates SHA-256, pdf page count, processed pages, total records, published records, needs-review records, missing source numbers, and duplicate keys.

- [ ] **Step 7: Test fixture pages before full extraction**

Run:

~~~bash
python -m pytest tests/content -q
~~~

Expected: fixture extraction and manifest tests pass.

- [ ] **Step 8: Run the full extraction and inspect the manifest**

Expected manifest assertions:

- DK source_pages = 362.
- Teikyo source_pages = 20.
- Teikyo source_numbers contains every integer from 1 through 228 exactly once before publication.
- published + needs_review equals total records.
- No empty source page or content key.

Do not publish needs_review records merely to reach a target count.

- [ ] **Step 9: Import reviewed records idempotently**

import_to_neon.py inserts content_sources, books, sections, content_lists, vocabulary_entries, and grammar_entries using stable source keys and ON CONFLICT DO UPDATE. Run it only after Vercel/Neon environment setup in Task 12.

- [ ] **Step 10: Commit scripts and safe manifests only**

~~~bash
git add scripts/content tests/content .gitignore
git commit -m "feat: add validated learning-content pipeline"
~~~

Do not add work/content or any JSONL containing full book content.

---

### Task 6: Implement the approved editorial design system and shell

**Files:**
- Modify: webapp/src/app/globals.css
- Modify: webapp/src/app/layout.tsx
- Create: webapp/src/components/site-header.tsx
- Create: webapp/src/components/background-atmosphere.tsx
- Create: webapp/public/images/kotonoha-atmosphere.webp
- Create: webapp/src/components/site-header.test.tsx

**Interfaces:**
- Produces: shared color/font/motion tokens, header navigation, accessible decorative background, and site metadata.
- Consumes: the approved second concept and revised subtle-background mock.

- [ ] **Step 1: Generate and inspect one background asset**

Use ImageGen to create a seamless 2400x1600 cool-white washi texture with extremely faint gray susuki silhouettes only at outer edges and blind-embossed kana in open areas. Save as public/images/kotonoha-atmosphere.webp only after checking that it contains no incorrect visible text or dominant illustration.

- [ ] **Step 2: Write the shell test**

Assert the header exposes links named 单词, 语法, 搜索, 收藏, and 登录, and that the decorative image has empty alt text.

- [ ] **Step 3: Implement layout metadata and fonts**

Use next/font/google for Noto_Serif_JP, Noto_Sans_SC, and IBM_Plex_Mono. Set html lang to zh-CN, add a skip link, and define site title/description and Open Graph metadata.

- [ ] **Step 4: Implement exact visual tokens**

Define Paper #F5F6F2, Ink #20282B, Mineral blue #315F80, Celadon #CAD5C8, Lacquer red #A43630, and Mist #DDE3E2 as CSS custom properties. Add focus-visible styles, 44px touch targets, max content width, mobile stacking, and prefers-reduced-motion overrides.

- [ ] **Step 5: Verify and commit**

Run:

~~~bash
npm test -- src/components/site-header.test.tsx
npm run typecheck
~~~

Expected: tests pass.

~~~bash
git add webapp/src/app webapp/src/components webapp/public/images
git commit -m "feat: establish KOTONOHA visual system"
~~~

---

### Task 7: Build the home experience and daily word

**Files:**
- Modify: webapp/src/app/page.tsx
- Create: webapp/src/components/specimen-strip.tsx
- Create: webapp/src/components/learning-paths.tsx
- Create: webapp/src/components/continue-learning.tsx
- Create: webapp/src/app/page.test.tsx

**Interfaces:**
- Consumes: getDailyWordCandidates(), selectDailyWord(), auth session, and shared shell.
- Produces: stable daily word, vocabulary/grammar entry paths, and personalized continuation.

- [ ] **Step 1: Expand the failing home test**

Assert a specimen region labeled 今日一词, links to /vocabulary and /grammar, the daily-update label, and an anonymous first-learning action.

- [ ] **Step 2: Implement the specimen strip**

Render Japanese, kana, Chinese, English, source, and an audio button. When no published candidate exists, render a direct 进入词书 action and no fabricated word.

- [ ] **Step 3: Implement the home page as a Server Component**

Fetch shared content and session in parallel. Compute Hong Kong date key on the server. Pass only interactive audio/hover behavior to small Client Components.

- [ ] **Step 4: Add graceful states**

Add loading.tsx and error.tsx with Chinese copy. The error boundary must offer Retry and the vocabulary directory link.

- [ ] **Step 5: Verify and commit**

Run npm test -- src/app/page.test.tsx, npm run typecheck, and npm run build.  
Expected: tests and build pass.

Commit:

~~~bash
git add webapp/src/app webapp/src/components
git commit -m "feat: build daily-word home experience"
~~~

---

### Task 8: Build vocabulary, DK, and JLPT routes

**Files:**
- Create: webapp/src/app/vocabulary/page.tsx
- Create: webapp/src/app/vocabulary/dk/page.tsx
- Create: webapp/src/app/vocabulary/dk/[category]/page.tsx
- Create: webapp/src/app/vocabulary/dk/[category]/[list]/page.tsx
- Create: webapp/src/app/vocabulary/jlpt/page.tsx
- Create: webapp/src/app/vocabulary/jlpt/[level]/page.tsx
- Create: webapp/src/components/vocabulary-list.tsx
- Create: webapp/src/components/study-card.tsx
- Test: webapp/src/app/vocabulary/vocabulary-routes.test.tsx

**Interfaces:**
- Consumes: enabled-source content queries and review actions.
- Produces: book directory, 15 DK categories, list browsing, flashcard mode, and N1-N5 pending states.

- [ ] **Step 1: Write route tests using a repository fixture**

Assert all 15 DK categories appear in source order, a category exposes its lists, a list exposes Japanese/kana/romaji/Chinese/English/page, and JLPT renders N1-N5 without invented word counts.

- [ ] **Step 2: Implement Server Component routes**

Await Next.js 16 params, return notFound() for disabled or unknown sources, and generate metadata from book/category/list names.

- [ ] **Step 3: Implement list and study modes**

The list is semantic table/list markup. Study mode shows one item at a time with keyboard shortcuts 1, 2, 3 for forgot, unsure, known; every button also remains visible and touch accessible.

- [ ] **Step 4: Implement JLPT pending states**

N1-N5 pages share one component and show 内容准备中 plus a back link when no published book is mounted.

- [ ] **Step 5: Verify and commit**

Run route tests, typecheck, lint, and build.  
Expected: all succeed.

~~~bash
git add webapp/src/app/vocabulary webapp/src/components
git commit -m "feat: add DK and JLPT vocabulary journeys"
~~~

---

### Task 9: Build grammar levels, details, and kana teaching

**Files:**
- Create: webapp/src/app/grammar/page.tsx
- Create: webapp/src/app/grammar/[level]/page.tsx
- Create: webapp/src/app/grammar/[level]/[slug]/page.tsx
- Create: webapp/src/app/grammar/beginner/kana/page.tsx
- Create: webapp/src/components/grammar-entry.tsx
- Create: webapp/src/components/kana-grid.tsx
- Create: webapp/src/components/kana-quiz.tsx
- Create: webapp/src/lib/content/kana.ts
- Test: webapp/src/app/grammar/grammar-routes.test.tsx
- Test: webapp/src/components/kana-quiz.test.tsx

**Interfaces:**
- Consumes: grammar queries, kana dataset, and review mutation.
- Produces: five grammar levels, Teikyo 1-228 directory/detail, hiragana/katakana lessons, and three quiz modes.

- [ ] **Step 1: Create and test the kana dataset**

Define gojuon rows plus voiced, semi-voiced, and contracted sounds. Each record has script, character, romaji, row, group, and an original example word. Test unique IDs and complete base rows.

- [ ] **Step 2: Write route and quiz tests**

Assert five levels, beginner kana entry, Teikyo source-number navigation, hiragana/katakana toggle, and correct/incorrect quiz feedback.

- [ ] **Step 3: Implement grammar routes**

Published Teikyo records sort by sourceNumber. Detail pages show pattern, connection, explanation, example, translation, source page, favorite, and review controls. Arrow keys move between adjacent entries.

- [ ] **Step 4: Implement kana teaching**

Use buttons for every kana, Web Speech API for Japanese pronunciation with a no-audio fallback, and the three PRD quiz modes. Persist kana review through the same progress interface.

- [ ] **Step 5: Verify and commit**

Run:

~~~bash
npm test -- src/app/grammar src/components/kana-quiz.test.tsx
npm run typecheck
npm run build
~~~

Expected: tests and build pass.

~~~bash
git add webapp/src/app/grammar webapp/src/components webapp/src/lib/content/kana.ts
git commit -m "feat: add grammar and kana learning"
~~~

---

### Task 10: Implement durable progress, offline queue, favorites, and review

**Files:**
- Create: webapp/src/lib/sync/offline-store.ts
- Create: webapp/src/lib/sync/sync-client.ts
- Create: webapp/src/app/api/sync/route.ts
- Create: webapp/src/app/actions/progress.ts
- Create: webapp/src/components/review-controls.tsx
- Create: webapp/src/app/review/page.tsx
- Test: webapp/src/lib/sync/sync-client.test.ts
- Test: webapp/src/app/api/sync/route.test.ts

**Interfaces:**
- Consumes: calculateNextReview(), mergeProgress(), requireUser(), syncEvents, userItemProgress, and favorites.
- Produces: enqueueProgressEvent(), flushProgressEvents(), authenticated idempotent sync, and mixed review queue.

- [ ] **Step 1: Write failing offline and API tests**

Test that a progress event is immediately queued, duplicate event IDs are accepted once, an unauthenticated API request returns 401, and a successful response removes only acknowledged IDs.

- [ ] **Step 2: Implement browser storage**

Use idb-keyval with keys kotonoha:progress and kotonoha:sync-events. Every event contains eventId from crypto.randomUUID(), itemId, kind, rating, occurredAt, and resulting progress.

- [ ] **Step 3: Implement authenticated sync**

The route validates a bounded array with Zod, calls requireUser(), inserts syncEvents on conflict do nothing, and upserts progress only for newly inserted event IDs. Never trust a client-supplied user ID.

- [ ] **Step 4: Implement optimistic review controls**

Update the UI and local queue immediately, then flush in the background. Show 已离线保存 when network fails and 已同步 after acknowledgement.

- [ ] **Step 5: Build the review queue**

Query nextReviewAt <= now for the signed-in user and merge local anonymous events before rendering. Mix vocabulary, grammar, and kana while preserving due order.

- [ ] **Step 6: Verify and commit**

Run sync tests, typecheck, and build.  
Expected: all pass.

~~~bash
git add webapp/src/lib/sync webapp/src/app/api/sync webapp/src/app/actions webapp/src/app/review webapp/src/components/review-controls.tsx
git commit -m "feat: persist learning progress with offline sync"
~~~

---

### Task 11: Add search, profile, accessibility, and full browser flows

**Files:**
- Create: webapp/src/app/search/page.tsx
- Create: webapp/src/components/search-form.tsx
- Modify: webapp/src/app/profile/page.tsx
- Create: webapp/src/app/not-found.tsx
- Create: webapp/src/app/error.tsx
- Create: webapp/playwright.config.ts
- Create: webapp/e2e/core-learning.spec.ts
- Create: webapp/e2e/accessibility.spec.ts

**Interfaces:**
- Consumes: searchContent(), Auth session, progress summary, and enabled-source filtering.
- Produces: multi-script search, profile summary, favorites, keyboard routes, and responsive end-to-end evidence.

- [ ] **Step 1: Write browser tests**

Cover home -> DK -> category -> list -> study rating; home -> grammar -> beginner -> kana quiz; search for Japanese and romaji; anonymous rating -> sign-in prompt; keyboard focus order; and 360/768/1024/1440 viewports.

- [ ] **Step 2: Implement search**

Normalize NFKC, trim input, cap it at 80 characters, and query Japanese, kana, romaji, Chinese, and English columns. Show grouped vocabulary and grammar results with sources.

- [ ] **Step 3: Implement profile and global states**

Profile displays learned count, due count, current streak, favorites, and continue-learning link. not-found and error screens preserve navigation and never expose database errors.

- [ ] **Step 4: Run browser tests**

Run:

~~~bash
npx playwright install chromium
npm run dev
npm run test:e2e
~~~

Expected: all core flows pass at four viewport widths with no console errors.

- [ ] **Step 5: Commit**

~~~bash
git add webapp/src/app webapp/src/components webapp/e2e webapp/playwright.config.ts
git commit -m "feat: complete search profile and browser flows"
~~~

---

### Task 12: Provision Neon/Vercel, import content, publish GitHub, and verify production

**Files:**
- Modify: webapp/README.md
- Create: webapp/docs/OPERATIONS.md
- Create locally only: webapp/.env.local
- Create locally only: webapp/.vercel/project.json

**Interfaces:**
- Consumes: validated app build, reviewed extraction output, GitHub authentication, Vercel authentication, and Neon/Vercel Marketplace access.
- Produces: production Neon schema/content, GitHub repository URL, Vercel production URL, and end-to-end verification report.

- [ ] **Step 1: Verify CLI identities before mutation**

Run:

~~~bash
gh auth status
vercel --version
vercel whoami
vercel teams ls
~~~

Expected: authenticated GitHub and Vercel accounts. If an identity is missing, use the official device-flow login and resume after success.

- [ ] **Step 2: Link Vercel before database commands**

List projects and either link an existing KOTONOHA project or create/link kotonoha-japanese:

~~~bash
vercel projects ls --scope <selected-scope>
vercel link --yes --scope <selected-scope> --project kotonoha-japanese
~~~

Expected: webapp/.vercel/project.json exists and identifies the chosen scope/project.

- [ ] **Step 3: Provision Neon through the Vercel integration**

Run:

~~~bash
vercel integration guide neon
vercel integration add neon --scope <selected-scope>
vercel env pull .env.local --yes
~~~

Provision Neon PostgreSQL for the resulting branch. Generate a stable 32+ character `BETTER_AUTH_SECRET` outside the repository, set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL` for development, preview, and production, and use the canonical URL for each environment's two URL variables. Pull the environment again, then compare key names from .env.example and .env.local without printing values.

- [ ] **Step 4: Apply migrations and import reviewed content**

Run:

~~~bash
npm run db:migrate
python ../scripts/content/import_to_neon.py \
  --manifest ../work/content/manifest.json \
  --dk ../work/content/dk-reviewed.jsonl \
  --grammar ../work/content/grammar-reviewed.jsonl
~~~

Expected: idempotent import reports source, book, list, vocabulary, grammar, published, and needs-review counts. Re-run and confirm counts do not duplicate.

- [ ] **Step 5: Run the final local gate**

Run:

~~~bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
git status --short
~~~

Expected: all tests/build pass and only intentional files are modified.

- [ ] **Step 6: Push to GitHub**

Create a repository named kotonoha-japanese if no remote exists, set origin, and push main:

~~~bash
gh repo create kotonoha-japanese --private --source=. --remote=origin
git push -u origin main
~~~

Expected: GitHub returns a repository URL and the source PDFs are absent from the pushed file tree.

- [ ] **Step 7: Deploy production**

Run from webapp:

~~~bash
vercel build --prod
vercel deploy --prebuilt --prod
~~~

Expected: Vercel returns a production URL and deployment status is Ready.

- [ ] **Step 8: Verify the complete production story**

Verify browser -> route/server action -> Neon data -> response UI for:

1. Home daily word and next-day algorithm test.
2. DK category/list and source-enabled filtering.
3. Teikyo grammar detail.
4. Kana quiz.
5. Registration, sign-in, rating, cross-session progress restore.
6. Offline queue replay.
7. Search.
8. Source disable/restore.

Inspect Vercel runtime logs for request errors and verify no secrets or PDF files are publicly reachable.

- [ ] **Step 9: Write operations documentation and commit**

OPERATIONS.md must document environment variable names, migration/import commands, source disable/restore SQL, backup/restore pointers, and deployment verification. It must not contain secret values.

~~~bash
git add webapp/README.md webapp/docs/OPERATIONS.md
git commit -m "docs: add deployment and takedown operations"
git push
~~~

---

## Plan Self-Review

- PRD coverage: Tasks 6-11 cover every page and interaction; Tasks 3-5 cover data, provenance, and takedown; Task 12 covers GitHub, Neon, Vercel, and production verification.
- Security: Auth is revalidated at mutations; secrets and PDFs are ignored; content can be disabled by source.
- Type consistency: daily-word, review, progress, Auth, query, and sync interfaces are defined before their consumers.
- Data integrity: full-source processing is manifested, but low-confidence records remain hidden instead of being silently published.
- No parallel subsystem requires a separate repository; webapp, pipeline, and operations remain independently testable within one product plan.
