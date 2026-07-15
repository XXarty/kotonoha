# KOTONOHA Adjacent Content Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable previous/next navigation to every vocabulary and grammar detail page while preserving the learner's current category, tier, or grammar path.

**Architecture:** Resolve adjacent entries inside the static content repository, expose typed neighbor queries, and render both content kinds through one presentational navigation component. Detail pages remain server components and receive fully resolved static neighbors without client state or Neon access.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, Playwright.

## Global Constraints

- Vocabulary neighbors must share both `category` and `tier` with the current entry.
- Grammar neighbors must share `path` and use the repository's `display_order` plus ID tie-break order.
- Unknown entries return null neighbors; group boundaries do not wrap.
- Links must use existing `contentRoute` helpers and keep 44px touch targets.
- Navigation renders after the main detail content and before `ConnectedStudyRater`.
- No new database reads, dependencies, image assets, or client-side state.

---

### Task 1: Repository neighbor queries

**Files:**
- Modify: `webapp/src/lib/content/types.ts`
- Modify: `webapp/src/lib/content/repository.ts`
- Modify: `webapp/src/lib/content/repository.test.ts`

**Interfaces:**
- Produces: `ContentNeighbors<T> = { previous: T | null; next: T | null }`.
- Produces: `getVocabularyNeighbors(id: string): ContentNeighbors<VocabularyEntry>`.
- Produces: `getGrammarNeighbors(slug: string): ContentNeighbors<GrammarEntry>`.

- [ ] **Step 1: Write failing repository tests**

Add fixtures that cover the middle and both boundaries of a vocabulary subgroup plus two grammar paths. Assert:

```ts
expect(repository.getVocabularyNeighbors("vocabulary:jmdict:middle")).toEqual({
  previous: expect.objectContaining({ id: "vocabulary:jmdict:first" }),
  next: expect.objectContaining({ id: "vocabulary:jmdict:last" }),
});
expect(repository.getVocabularyNeighbors("vocabulary:jmdict:first").previous).toBeNull();
expect(repository.getVocabularyNeighbors("vocabulary:jmdict:last").next).toBeNull();
expect(repository.getVocabularyNeighbors("vocabulary:jmdict:other-tier")).toEqual({
  previous: null,
  next: null,
});
expect(repository.getVocabularyNeighbors("missing")).toEqual({ previous: null, next: null });
```

For grammar, assert the same boundary behavior and prove the last entry of `foundation` does not connect to the first entry of `core`.

- [ ] **Step 2: Run repository tests and verify RED**

Run:

```bash
cd webapp
npm test -- src/lib/content/repository.test.ts
```

Expected: FAIL because both neighbor query methods are undefined.

- [ ] **Step 3: Add the typed neighbor result**

Add to `types.ts`:

```ts
export interface ContentNeighbors<T> {
  previous: T | null;
  next: T | null;
}
```

- [ ] **Step 4: Implement minimal repository queries**

Inside `createContentRepository`, group vocabulary by the current entry's exact `category` and `tier`, use the existing array order, and use `grammarByPath` for grammar. A shared internal helper may return adjacent values by index, but it must return nulls for unknown or isolated items.

Export both methods from `contentRepository` and the module-level destructuring export.

- [ ] **Step 5: Run repository tests and verify GREEN**

Run the Step 2 command again.

Expected: repository tests pass, including boundary and cross-group assertions.

- [ ] **Step 6: Commit repository behavior**

```bash
git add webapp/src/lib/content/types.ts webapp/src/lib/content/repository.ts webapp/src/lib/content/repository.test.ts
git commit -m "feat: resolve adjacent learning content"
```

---

### Task 2: Shared adjacent-navigation component

**Files:**
- Create: `webapp/src/components/adjacent-content-nav.tsx`
- Create: `webapp/src/components/adjacent-content-nav.test.tsx`
- Modify: `webapp/src/app/globals.css`

**Interfaces:**
- Consumes: `previous` and `next` values shaped as `{ href: string; label: string } | null`.
- Produces: `<AdjacentContentNav previous={...} next={...} />`.

- [ ] **Step 1: Write failing component tests**

Test the desired component API before creating it:

```tsx
render(
  <AdjacentContentNav
    previous={{ href: "/previous", label: "あげる" }}
    next={{ href: "/next", label: "諦める" }}
  />,
);
expect(screen.getByRole("navigation", { name: "相邻内容" })).toBeVisible();
expect(screen.getByRole("link", { name: "上一个 あげる" })).toHaveAttribute("href", "/previous");
expect(screen.getByRole("link", { name: "下一个 諦める" })).toHaveAttribute("href", "/next");
```

Add separate cases for a missing previous item, a missing next item, and both values null. With both null, the component returns `null` and renders no navigation region.

- [ ] **Step 2: Run component tests and verify RED**

Run:

```bash
cd webapp
npm test -- src/components/adjacent-content-nav.test.tsx
```

Expected: FAIL because the component module does not exist.

- [ ] **Step 3: Implement the component**

Use `next/link`, `<nav aria-label="相邻内容">`, and two directional link classes. Render a direction caption plus a Japanese label; do not render placeholder controls for missing directions.

- [ ] **Step 4: Add responsive styles**

Add `.adjacent-content-nav`, `.adjacent-content-link`, `.adjacent-content-link-next`, `.adjacent-content-direction`, and `.adjacent-content-label`. Desktop uses two columns and right-aligns the next link; the 720px breakpoint stacks links vertically. Each rendered link has `min-height: 2.75rem` and retains the global focus ring.

- [ ] **Step 5: Run component tests and verify GREEN**

Run the Step 2 command again.

Expected: all component cases pass.

- [ ] **Step 6: Commit the component**

```bash
git add webapp/src/components/adjacent-content-nav.tsx webapp/src/components/adjacent-content-nav.test.tsx webapp/src/app/globals.css
git commit -m "feat: add adjacent content controls"
```

---

### Task 3: Integrate vocabulary and grammar detail pages

**Files:**
- Modify: `webapp/src/app/vocabulary/entry/[id]/page.tsx`
- Modify: `webapp/src/app/vocabulary/entry/[id]/page.test.tsx`
- Modify: `webapp/src/app/grammar/entry/[slug]/page.tsx`
- Modify: `webapp/src/app/grammar/entry/[slug]/page.test.tsx`

**Interfaces:**
- Consumes: repository neighbor queries from Task 1.
- Consumes: `AdjacentContentNav` from Task 2.

- [ ] **Step 1: Write failing page tests**

Mock `getVocabularyNeighbors` and `getGrammarNeighbors`. Assert vocabulary uses encoded stable ID routes and grammar uses slug routes:

```ts
expect(screen.getByRole("link", { name: "上一个 あげる" })).toHaveAttribute(
  "href",
  "/vocabulary/entry/vocabulary%3Ajmdict%3A1000001",
);
expect(screen.getByRole("link", { name: "下一个 〜がある" })).toHaveAttribute(
  "href",
  "/grammar/entry/ga-aru",
);
```

Also assert `getVocabularyNeighbors` receives the decoded stable ID, `getGrammarNeighbors` receives the current slug, and missing sides do not render links.

- [ ] **Step 2: Run page tests and verify RED**

Run:

```bash
cd webapp
npm test -- 'src/app/vocabulary/entry/[id]/page.test.tsx' 'src/app/grammar/entry/[slug]/page.test.tsx'
```

Expected: FAIL because the pages neither query nor render adjacent content.

- [ ] **Step 3: Integrate both pages**

Resolve neighbors immediately after the current entry. Render `AdjacentContentNav` after `.detail-grid` and before `.detail-learning-rater`. Map vocabulary labels from `japanese` and grammar labels from `expression`; build hrefs with `contentRoute.vocabularyEntry` and `contentRoute.grammarEntry`.

- [ ] **Step 4: Run page tests and verify GREEN**

Run the Step 2 command again.

Expected: both page test files pass.

- [ ] **Step 5: Run full verification with the ambient-background plan**

After completing `2026-07-15-ambient-washi-background-implementation.md`, run:

```bash
cd webapp
npm test -- --run
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all unit tests pass, lint/typecheck/build exit 0, all 12 static pages generate, and E2E exits 0 with only intentional viewport skips.

- [ ] **Step 6: Browser QA and release**

Verify desktop and 390px mobile flows:

`detail page loads → adjacent link is visible → link opens the exact expected neighbor → background remains behind content → no horizontal overflow or framework error overlay`.

Then commit any final test-only adjustments, push `main`, and wait for the Git-integrated Vercel Production deployment to reach `Ready`.

