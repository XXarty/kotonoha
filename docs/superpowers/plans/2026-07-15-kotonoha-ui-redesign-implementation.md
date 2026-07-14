# KOTONOHA UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current specimen-room interface with the approved warm “morning mist letter + washi dot texture” design, rewrite the product copy, and replace the standalone search page with an accessible global search overlay.

**Architecture:** Keep Next.js App Router server components for content pages and introduce one focused client boundary, `GlobalSearch`, in the header. The overlay lazily fetches `/content/search-index.json`, uses pure search helpers, and preserves the existing detail routes. Directory pages use server-side query parsing and pagination so the expanded dataset never renders thousands of rows at once.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, Vitest 4, Testing Library, Playwright 1.61, Lucide React.

**Cross-plan order:** Execute Content Expansion Tasks 1–7 first so the expanded runtime types and public search index exist. Then execute UI Tasks 1–7, Content Expansion Tasks 8–10, and finally UI Task 8 for integrated browser verification and Preview deployment.

## Global Constraints

- Use Node.js `^20.19.0 || ^22.13.0 || >=24.0.0`.
- Preserve the existing GitHub + Vercel deployment and optional Neon authentication architecture.
- Use the approved “晨雾来信 × 和纸点纹” visual direction; no cherry blossoms, torii, anime motifs, or ornamental Japanese clichés.
- Keep body text at least 16px with approximately 1.7 line height and WCAG AA contrast.
- Keep motion between 180ms and 300ms and disable nonessential motion under `prefers-reduced-motion: reduce`.
- Remove Search from primary navigation; `/search` remains only as a compatibility redirect.
- Do not preload the full vocabulary bundle on the home page.
- Public browsing and search must continue working when Neon environment variables are absent.
- Use Sites, frontend-design, and Build Web Apps skills during execution; retain Vercel as the deployment target.
- Follow `webapp/AGENTS.md` and read the relevant local Next.js 16 docs before changing routing or client boundaries.

---

## File Structure

- `webapp/src/lib/site-copy.ts`: shared warm, factual product copy.
- `webapp/src/lib/content/search-index.ts`: search index types, normalization, ranking, and fetch function.
- `webapp/src/lib/content/pagination.ts`: safe query parsing and list slicing.
- `webapp/src/components/global-search.tsx`: accessible overlay, lazy loading, keyboard control, and result rendering.
- `webapp/src/components/site-header.tsx`: responsive navigation and search trigger.
- `webapp/src/components/home-hero.tsx`: approved home hero copy and actions.
- `webapp/src/components/content-list.tsx`: redesigned directory cards and path metadata.
- `webapp/src/app/globals.css`: tokens, texture, layout primitives, and reduced-motion rules.
- Existing route pages: server-rendered composition and warm copy.
- Matching `*.test.tsx` and `*.test.ts` files: behavior contracts for each unit.

---

### Task 1: Establish the Visual Tokens and Copy Contract

**Files:**
- Create: `webapp/src/lib/site-copy.ts`
- Modify: `webapp/src/app/globals.css`
- Modify: `webapp/src/app/layout.tsx`
- Modify: `webapp/src/components/site-footer.tsx`
- Test: `webapp/src/app/page.test.tsx`

**Interfaces:**
- Produces: `siteCopy` with `home`, `empty`, `review`, and `search` keys.
- Produces: CSS classes `.paper-panel`, `.washi-surface`, `.reveal-soft`, `.page-intro`, and updated button/focus primitives.

- [ ] **Step 1: Write the failing copy and metadata tests**

```tsx
it("uses the warm daily-learning message", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "今天，也为自己留一点语言的时间。" })).toBeVisible();
  expect(screen.getByText("从一个词、一句话开始，让日语慢慢住进日常。" )).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run from `webapp/`: `npm test -- src/app/page.test.tsx`

Expected: FAIL because the current page still renders `ことのは KOTONOHA` as its main heading and does not expose the approved copy.

- [ ] **Step 3: Add the shared copy object**

```ts
export const siteCopy = {
  home: {
    eyebrow: "A small letter, every day",
    title: "今天，也为自己留一点语言的时间。",
    description: "从一个词、一句话开始，让日语慢慢住进日常。",
    primaryAction: "开始今天的学习",
  },
  search: {
    placeholder: "输入日文、假名、罗马字或中文",
    empty: "这里暂时还没有匹配内容。换一个关键词，或回到学习路径看看。",
  },
  review: {
    prompt: "不用一次记住全部。把今天会的，轻轻留下来。",
  },
} as const;
```

- [ ] **Step 4: Replace the design tokens and add the approved texture and motion**

```css
:root {
  --paper: #f7f3ea;
  --mist: #edf1e8;
  --ink: #26332e;
  --ink-soft: #65716b;
  --moss: #667d6e;
  --sage: #bcc8bc;
  --line: #d7ddd5;
  --white-soft: rgba(255, 255, 255, 0.62);
}

body {
  color: var(--ink);
  background:
    radial-gradient(circle at 1px 1px, rgba(82, 101, 90, .12) .55px, transparent .65px) 0 0 / 8px 8px,
    linear-gradient(145deg, var(--mist), var(--paper) 68%);
  font-size: 16px;
  line-height: 1.7;
}

.paper-panel {
  border: 1px solid color-mix(in srgb, var(--line) 86%, transparent);
  border-radius: 1.25rem;
  background: var(--white-soft);
  backdrop-filter: blur(12px);
}

.reveal-soft { animation: reveal-soft 240ms ease-out both; }
@keyframes reveal-soft { from { opacity: 0; transform: translateY(8px); } }
```

Keep the existing visible focus outline, 44px minimum touch targets, and reduced-motion override.

- [ ] **Step 5: Update metadata and footer copy**

Set the default title to `ことのは｜每天一点日语` and description to `从一个词、一句话开始，让日语慢慢住进日常。`. Change the footer sentence to `ことばを、少しずつ。愿每一次打开，都能轻轻记住一点。` while preserving the Sources link and noncommercial notice.

- [ ] **Step 6: Run tests and static checks**

Run: `npm test -- src/app/page.test.tsx`

Run: `npm run lint`

Expected: both commands PASS.

- [ ] **Step 7: Commit**

```bash
git add webapp/src/lib/site-copy.ts webapp/src/app/globals.css webapp/src/app/layout.tsx webapp/src/components/site-footer.tsx webapp/src/app/page.test.tsx
git commit -m "feat: establish warm kotonoha design system"
```

---

### Task 2: Implement Pure Search Index Ranking

**Files:**
- Create: `webapp/src/lib/content/search-index.ts`
- Create: `webapp/src/lib/content/search-index.test.ts`

**Interfaces:**
- Consumes: `SearchIndexEntry[]` from `/content/search-index.json`.
- Produces: `normalizeSearch(value: string): string`.
- Produces: `rankSearchResults(entries: readonly SearchIndexEntry[], query: string, limit?: number): SearchIndexEntry[]`.
- Produces: `loadSearchIndex(signal?: AbortSignal): Promise<SearchIndexEntry[]>`.

- [ ] **Step 1: Write failing ranking tests**

```ts
const entries = [
  { id: "vocabulary:jmdict:1", kind: "vocabulary", primary: "灯", reading: "あかり", romaji: "akari", meaning: "灯光", href: "/vocabulary/entry/vocabulary%3Ajmdict%3A1" },
  { id: "grammar:tae-kim:akari", kind: "grammar", primary: "〜そう", reading: "", romaji: "", meaning: "看起来像", href: "/grammar/entry/akari" },
];

it("ranks exact primary matches before partial transliteration matches", () => {
  expect(rankSearchResults(entries, "灯").map((item) => item.id)).toEqual(["vocabulary:jmdict:1"]);
  expect(rankSearchResults(entries, "ＡＫＡＲＩ")[0]?.id).toBe("vocabulary:jmdict:1");
});

it("returns at most eight results and no results for blank input", () => {
  expect(rankSearchResults(entries, " ")).toEqual([]);
  expect(rankSearchResults(Array(20).fill(entries[0]), "灯")).toHaveLength(8);
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `npm test -- src/lib/content/search-index.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the exact public contract**

```ts
export interface SearchIndexEntry {
  id: string;
  kind: "vocabulary" | "grammar" | "kana";
  primary: string;
  reading: string;
  romaji: string;
  meaning: string;
  href: string;
}

export function normalizeSearch(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ja");
}

function score(entry: SearchIndexEntry, query: string) {
  const fields = [entry.primary, entry.reading, entry.romaji, entry.meaning].map(normalizeSearch);
  if (fields[0] === query) return 0;
  if (fields[1] === query || fields[2] === query) return 1;
  if (fields.some((field) => field.startsWith(query))) return 2;
  if (fields.some((field) => field.includes(query))) return 3;
  return null;
}
```

Sort matches by score, then `primary.localeCompare(..., "ja")`, then stable `id`. Clamp the limit to `1..8`. `loadSearchIndex` fetches `/content/search-index.json`, checks `response.ok`, parses JSON, and throws `new Error("search index unavailable")` for a non-array payload.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- src/lib/content/search-index.test.ts`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/lib/content/search-index.ts webapp/src/lib/content/search-index.test.ts
git commit -m "feat: add compact search index ranking"
```

---

### Task 3: Build the Accessible Global Search Overlay

**Files:**
- Create: `webapp/src/components/global-search.tsx`
- Create: `webapp/src/components/global-search.test.tsx`
- Modify: `webapp/src/components/site-header.tsx`
- Modify: `webapp/src/components/site-header.test.tsx`

**Interfaces:**
- Consumes: `loadSearchIndex()` and `rankSearchResults()` from Task 2.
- Produces: `GlobalSearch({ loader? })`, where `loader` is injectable for deterministic tests.
- Produces: header button named `搜索全站内容`; Search is absent from navigation links.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it("opens from the header, searches in place, and restores focus on Escape", async () => {
  const user = userEvent.setup();
  render(<GlobalSearch loader={async () => fixtureIndex} />);
  const trigger = screen.getByRole("button", { name: "搜索全站内容" });
  await user.click(trigger);
  expect(screen.getByRole("dialog", { name: "搜索日语内容" })).toBeVisible();
  await user.type(screen.getByRole("searchbox"), "灯");
  expect(await screen.findByRole("link", { name: /灯.*あかり.*灯光/ })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(trigger).toHaveFocus();
});

it("shows retry and directory links when loading fails", async () => {
  render(<GlobalSearch loader={async () => { throw new Error("offline"); }} />);
  await userEvent.click(screen.getByRole("button", { name: "搜索全站内容" }));
  expect(await screen.findByText("暂时无法载入搜索内容。" )).toBeVisible();
  expect(screen.getByRole("link", { name: "去单词目录" })).toHaveAttribute("href", "/vocabulary");
});
```

- [ ] **Step 2: Run the component tests and confirm RED**

Run: `npm test -- src/components/global-search.test.tsx src/components/site-header.test.tsx`

Expected: FAIL because the overlay is missing and the header still contains a Search link.

- [ ] **Step 3: Implement the overlay state machine**

Use states `closed | loading | ready | error`; cache the loaded array in component state. On open, store the trigger element, show a fixed `role="dialog" aria-modal="true" aria-label="搜索日语内容"`, focus the searchbox, and start the loader once. On `Escape`, close and restore trigger focus. On `ArrowDown`/`ArrowUp`, move an active index through results; on `Enter`, click the active result. Clear the query each time the dialog closes.

Render result links using the exact `href` from the search index. Use `aria-live="polite"` for result counts and errors. Lock body scrolling only while open and restore it in effect cleanup.

- [ ] **Step 4: Replace the header Search link with the overlay trigger**

```tsx
const navigation = [
  ["单词", "/vocabulary"],
  ["语法", "/grammar"],
  ["五十音", "/kana"],
  ["复习", "/review"],
] as const;
```

Keep the brand link and login link. On mobile, wrap navigation in a semantic menu controlled by a button with `aria-expanded`; the search trigger remains outside the collapsed menu.

- [ ] **Step 5: Run tests and accessibility-focused assertions**

Run: `npm test -- src/components/global-search.test.tsx src/components/site-header.test.tsx`

Expected: PASS, including focus restoration, error fallback, keyboard result selection, and no navigation link named Search.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/components/global-search.tsx webapp/src/components/global-search.test.tsx webapp/src/components/site-header.tsx webapp/src/components/site-header.test.tsx
git commit -m "feat: replace search page with global overlay"
```

---

### Task 4: Preserve the Legacy Search URL

**Files:**
- Replace: `webapp/src/app/search/page.tsx`
- Modify: `webapp/src/app/search/page.test.tsx`
- Modify: `webapp/src/lib/content/routes.ts`

**Interfaces:**
- Consumes: Next.js 16 `redirect()`.
- Produces: `/search?q=灯` redirecting to `/?search=1&q=%E7%81%AF`.
- Removes: `contentRoute.search` from navigation consumers.

- [ ] **Step 1: Write the failing redirect test**

```ts
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

it("redirects the old search URL into the global overlay", async () => {
  await SearchPage({ searchParams: Promise.resolve({ q: "灯" }) });
  expect(redirect).toHaveBeenCalledWith("/?search=1&q=%E7%81%AF");
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/app/search/page.test.tsx`

Expected: FAIL because the route still renders a full page.

- [ ] **Step 3: Implement the server redirect and URL-triggered overlay**

```tsx
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = (await searchParams).q;
  const query = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  redirect(`/?search=1&q=${encodeURIComponent(query)}`);
}
```

In `GlobalSearch`, read `useSearchParams()` and open once when `search === "1"`; seed the input from `q`. Closing the overlay must use `history.replaceState(null, "", pathname)` so refresh does not reopen it.

Wrap the header's `GlobalSearch` boundary in `<Suspense fallback={<SearchTriggerSkeleton />}>` so Next.js 16 can prerender public routes while the client component reads search parameters.

- [ ] **Step 4: Run route and overlay tests**

Run: `npm test -- src/app/search/page.test.tsx src/components/global-search.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/app/search/page.tsx webapp/src/app/search/page.test.tsx webapp/src/components/global-search.tsx webapp/src/components/global-search.test.tsx webapp/src/lib/content/routes.ts
git commit -m "fix: preserve legacy search links"
```

---

### Task 5: Redesign the Home and Directory Experiences

**Files:**
- Create: `webapp/src/components/home-hero.tsx`
- Create: `webapp/src/components/home-hero.test.tsx`
- Modify: `webapp/src/app/page.tsx`
- Modify: `webapp/src/components/specimen-word.tsx`
- Modify: `webapp/src/components/content-list.tsx`
- Modify: `webapp/src/app/vocabulary/page.tsx`
- Modify: `webapp/src/app/grammar/page.tsx`
- Test: `webapp/src/app/page.test.tsx`
- Test: `webapp/src/app/vocabulary/page.test.tsx`
- Test: `webapp/src/app/grammar/page.test.tsx`

**Interfaces:**
- Consumes: `siteCopy`, real repository counts, `DailyWordCandidate`, and `ContentDirectoryItem`.
- Produces: warm home hero, daily word letter card, honest counts, vocabulary tier introduction, and four grammar path cards.

- [ ] **Step 1: Write failing page hierarchy tests**

Assert the home has one approved H1, a `开始今天的学习` link to `/vocabulary`, a visible `今日のことば` region, and real vocabulary/grammar counts. Assert the vocabulary page mentions `日常核心` and `进阶扩展`. Assert the grammar page exposes four path links named `基础`, `核心`, `常用表达`, and `进阶`.

- [ ] **Step 2: Run the three page tests and confirm RED**

Run: `npm test -- src/app/page.test.tsx src/app/vocabulary/page.test.tsx src/app/grammar/page.test.tsx`

Expected: FAIL because current pages use specimen-room copy and five grammar categories.

- [ ] **Step 3: Implement `HomeHero` and recompose the home page**

`HomeHero` renders the shared eyebrow, H1, description, primary vocabulary link, and a quiet secondary grammar link. Home order must be hero, daily word, continue-learning/account guidance, three learning entrances, and source/count note. Use semantic sections and do not import vocabulary JSON directly into any client component.

- [ ] **Step 4: Redesign the directory card contract**

Extend `ContentDirectoryItem` with optional `meta?: string` and `tone?: "mist" | "paper"`. Render each card with title, description, honest count, and Chinese action text `打开这条路径`. Remove `OPEN COLLECTION`.

- [ ] **Step 5: Run page tests and update snapshots only when assertions are semantic**

Run: `npm test -- src/components/home-hero.test.tsx src/app/page.test.tsx src/app/vocabulary/page.test.tsx src/app/grammar/page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/components/home-hero.tsx webapp/src/components/home-hero.test.tsx webapp/src/components/specimen-word.tsx webapp/src/components/content-list.tsx webapp/src/app/page.tsx webapp/src/app/page.test.tsx webapp/src/app/vocabulary/page.tsx webapp/src/app/vocabulary/page.test.tsx webapp/src/app/grammar/page.tsx webapp/src/app/grammar/page.test.tsx webapp/src/lib/content/types.ts
git commit -m "feat: redesign learning home and directories"
```

---

### Task 6: Add Safe Vocabulary Pagination and Tier Filtering

**Files:**
- Create: `webapp/src/lib/content/pagination.ts`
- Create: `webapp/src/lib/content/pagination.test.ts`
- Modify: `webapp/src/lib/content/repository.ts`
- Modify: `webapp/src/lib/content/repository.test.ts`
- Modify: `webapp/src/app/vocabulary/[category]/page.tsx`
- Modify: `webapp/src/app/vocabulary/[category]/page.test.tsx`

**Interfaces:**
- Consumes: `VocabularyEntry[]`, `page` query, and `tier` query.
- Produces: `paginate<T>(items: readonly T[], rawPage: string | string[] | undefined, pageSize?: number)` returning `{ items, page, pageCount, total }`.
- Produces: `getVocabularyList(category, { tier? })`.

- [ ] **Step 1: Write failing pure pagination tests**

```ts
it("clamps invalid pages and slices sixty entries", () => {
  const items = Array.from({ length: 125 }, (_, id) => ({ id }));
  expect(paginate(items, "2")).toMatchObject({ page: 2, pageCount: 3, total: 125 });
  expect(paginate(items, "2").items).toHaveLength(60);
  expect(paginate(items, "999").page).toBe(3);
  expect(paginate(items, "bad").page).toBe(1);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/lib/content/pagination.test.ts src/app/vocabulary/[category]/page.test.tsx`

Expected: FAIL because pagination and tier-aware repository APIs do not exist.

- [ ] **Step 3: Implement the helper and repository filter**

Use `pageSize = 60`, clamp it to `1..80`, parse only finite positive integers, and return an empty page with `page = 1` and `pageCount = 1` for zero items. Filter `tier` only when it is exactly `core` or `extended`; unknown values mean all tiers.

- [ ] **Step 4: Render filters and previous/next links**

The server page awaits both `params` and `searchParams`, filters through the repository, and slices through `paginate`. Preserve `tier` when generating page links. Add `aria-current="page"` to the current page and show `第 N / M 页 · 共 X 条`.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/lib/content/pagination.test.ts src/lib/content/repository.test.ts src/app/vocabulary/[category]/page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add webapp/src/lib/content/pagination.ts webapp/src/lib/content/pagination.test.ts webapp/src/lib/content/repository.ts webapp/src/lib/content/repository.test.ts 'webapp/src/app/vocabulary/[category]/page.tsx' 'webapp/src/app/vocabulary/[category]/page.test.tsx'
git commit -m "feat: paginate and tier vocabulary lists"
```

---

### Task 7: Redesign Detail, Kana, Review, and Account States

**Files:**
- Modify: `webapp/src/app/vocabulary/entry/[id]/page.tsx`
- Modify: `webapp/src/app/vocabulary/entry/[id]/page.test.tsx`
- Modify: `webapp/src/app/grammar/entry/[slug]/page.tsx`
- Modify: `webapp/src/app/grammar/entry/[slug]/page.test.tsx`
- Modify: `webapp/src/app/kana/page.tsx`
- Modify: `webapp/src/app/kana/page.test.tsx`
- Modify: `webapp/src/app/review/page.tsx`
- Modify: `webapp/src/components/review-experience.tsx`
- Modify: `webapp/src/components/study-rater.tsx`
- Modify: `webapp/src/components/study-rater.test.tsx`
- Modify: `webapp/src/components/auth-form.tsx`

**Interfaces:**
- Consumes: expanded `VocabularyEntry.examples?` and `GrammarEntry.examples`, `common_mistakes`, and `related_entries` from the content plan.
- Produces: optional vocabulary example block; required grammar examples, mistakes, related links, and source block.

- [ ] **Step 1: Write failing semantic tests**

Vocabulary fixture with no examples must have no heading named `例句`; a fixture with examples must render the Japanese and Chinese pair. Grammar detail must render headings `接续`, `例句`, `容易混淆的地方`, and `一起比较`. Review guidance must include the approved sentence `不用一次记住全部。把今天会的，轻轻留下来。`.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- 'src/app/vocabulary/entry/[id]/page.test.tsx' 'src/app/grammar/entry/[slug]/page.test.tsx' src/components/study-rater.test.tsx`

Expected: FAIL because the current data contract has one grammar example and no mistake or related sections.

- [ ] **Step 3: Implement the detail composition**

Use a two-column desktop layout that collapses to one column below 720px. Place the learning rater after the learning content, not between the expression and explanation. Render optional arrays only when nonempty. Resolve `related_entries` through the repository and omit missing or disabled IDs without deleting stored progress.

- [ ] **Step 4: Apply consistent warm states**

Change success copy to `已经轻轻记下，下次再见。`; change guest guidance to `这次记录会留在这台设备上。登录后，也能在其他设备继续。`; keep error messages explicit and actionable. Restyle kana cells as paper cards with strong Japanese glyph contrast.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- 'src/app/vocabulary/entry/[id]/page.test.tsx' 'src/app/grammar/entry/[slug]/page.test.tsx' src/app/kana/page.test.tsx src/components/study-rater.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'webapp/src/app/vocabulary/entry/[id]/page.tsx' 'webapp/src/app/vocabulary/entry/[id]/page.test.tsx' 'webapp/src/app/grammar/entry/[slug]/page.tsx' 'webapp/src/app/grammar/entry/[slug]/page.test.tsx' webapp/src/app/kana/page.tsx webapp/src/app/kana/page.test.tsx webapp/src/app/review/page.tsx webapp/src/components/review-experience.tsx webapp/src/components/study-rater.tsx webapp/src/components/study-rater.test.tsx webapp/src/components/auth-form.tsx
git commit -m "feat: warm and clarify learning detail flows"
```

---

### Task 8: Verify Responsive Behavior and Ship a Preview

**Files:**
- Modify: `webapp/e2e/mvp.spec.ts`
- Modify: `webapp/playwright.config.ts` only if the existing four viewports are not configured.
- Modify: `webapp/README.md`

**Interfaces:**
- Consumes: completed UI tasks and current generated content.
- Produces: verified keyboard search, responsive pages, reduced-motion behavior, and a Vercel Preview URL.

- [ ] **Step 1: Add failing end-to-end journeys**

Add tests for: open search from the header, type `諦める`, select the result without visiting `/search`, rate the word, close with Escape and restore focus; visit each target viewport `360`, `768`, `1024`, and `1440`; verify `document.documentElement.scrollWidth <= window.innerWidth`; emulate reduced motion and assert the search overlay has no nonzero animation duration.

- [ ] **Step 2: Run the focused browser suite and confirm failures**

Run: `npm run test:e2e -- --grep "global search|responsive|reduced motion"`

Expected: failing assertions identify any remaining overflow, focus, or animation issues.

- [ ] **Step 3: Fix only the reported UI defects**

Adjust CSS breakpoints, grid minimums, overflow containment, and reduced-motion selectors. Do not change content contracts in this task.

- [ ] **Step 4: Run the complete verification matrix**

Run from repository root: `.venv-content/bin/python -m pytest tests/content -q`

Run from `webapp/`: `npm test`

Run: `npm run lint`

Run: `npm run typecheck`

Run: `npm run build`

Run: `npm run test:e2e`

Expected: all commands PASS.

- [ ] **Step 5: Update the README**

Document the global overlay search, lazy `/content/search-index.json`, vocabulary pagination, visual accessibility behavior, and the rule that public content works without Neon.

- [ ] **Step 6: Commit**

```bash
git add webapp/e2e/mvp.spec.ts webapp/playwright.config.ts webapp/README.md
git commit -m "test: verify redesigned learning experience"
```

- [ ] **Step 7: Deploy a Vercel Preview**

Run from `webapp/`: `vercel deploy . -y`

Expected: a Preview URL for `kotonoha-japanese-learning`; do not use `--prod` until the user approves the preview.
