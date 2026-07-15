# KOTONOHA Ambient Washi Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quiet, animated washi-dot and ink-halo background without changing vocabulary-tier navigation behavior.

**Architecture:** Keep the feature CSS-only by using fixed `body::before` and `body::after` decorative layers. Place site content above those layers, animate only `transform` and `opacity`, and rely on the existing reduced-motion media query to disable animation.

**Tech Stack:** Next.js 16, React 19, CSS, Vitest, Playwright, Vercel.

## Global Constraints

- Do not add image assets or network requests.
- Keep “日常核心” and “进阶扩展” as non-interactive explanatory articles.
- Decorative layers must use `pointer-events: none` and must not create horizontal overflow.
- `prefers-reduced-motion: reduce` must stop all ambient animation.
- Text, forms, panels, navigation, and current contrast tokens must remain unchanged.

---

### Task 1: Ambient background and release verification

**Files:**
- Modify: `webapp/src/app/design-tokens.test.ts`
- Modify: `webapp/src/app/vocabulary/page.test.tsx`
- Modify: `webapp/src/app/globals.css`

**Interfaces:**
- Consumes: existing `body`, `.site-content`, `.site-footer`, and `prefers-reduced-motion` CSS contracts.
- Produces: `body::before`, `body::after`, `washi-drift`, and `ink-halo-drift` presentation contracts.

- [ ] **Step 1: Write failing CSS contract tests**

Add assertions that require two fixed decorative body layers, `pointer-events: none`, long-running ambient animations, and reduced-motion suppression:

```ts
describe("ambient washi background", () => {
  it("keeps decorative texture fixed behind interactive content", () => {
    expect(rule("body::before, body::after")).toContain("position: fixed");
    expect(rule("body::before, body::after")).toContain("pointer-events: none");
    expect(rule("body::before")).toContain("radial-gradient");
    expect(rule("body::after")).toContain("radial-gradient");
  });

  it("uses slow ambient motion and disables it for reduced motion", () => {
    expect(rule("body::before")).toContain("washi-drift 36s");
    expect(rule("body::after")).toContain("ink-halo-drift 44s");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation: none !important");
  });
});
```

Also add a vocabulary-page assertion proving the two tier headings are not links:

```ts
expect(screen.queryByRole("link", { name: "日常核心" })).not.toBeInTheDocument();
expect(screen.queryByRole("link", { name: "进阶扩展" })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd webapp
npm test -- src/app/design-tokens.test.ts src/app/vocabulary/page.test.tsx
```

Expected: the new ambient-background assertions fail because `body::before`, `body::after`, `washi-drift`, and `ink-halo-drift` do not exist.

- [ ] **Step 3: Implement the minimal CSS background**

Add shared body pseudo-element positioning, a sparse dot layer, two large translucent radial halos, and slow transform-only keyframes. Keep `.site-content` and `.site-footer` above the decorative layers, lower halo opacity at the mobile breakpoint, and leave the existing global reduced-motion rule intact.

Required CSS contracts:

```css
body { position: relative; isolation: isolate; overflow-x: clip; }
body::before, body::after {
  position: fixed;
  z-index: 0;
  pointer-events: none;
  content: "";
}
body::before { animation: washi-drift 36s linear infinite alternate; }
body::after { animation: ink-halo-drift 44s ease-in-out infinite alternate; }
.site-content, .site-footer { position: relative; z-index: 1; }
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command again.

Expected: both test files pass with no warnings.

- [ ] **Step 5: Run full static verification**

Run:

```bash
cd webapp
npm test -- --run
npm run lint
npm run typecheck
npm run build
```

Expected: 40 test files pass, lint/typecheck exit 0, and Next.js generates all 12 static pages.

- [ ] **Step 6: Run browser and E2E verification**

Validate the flow `home loads → ambient layers render behind content → vocabulary tier cards remain explanatory → mobile and reduced-motion states remain readable` at desktop and 390px mobile widths. Confirm no framework overlay, relevant console errors, horizontal overflow, or intercepted interactions.

Run:

```bash
cd webapp
npm run test:e2e
```

Expected: Playwright exits 0 with the repository's intentional viewport skips unchanged.

- [ ] **Step 7: Commit and deploy**

```bash
git add webapp/src/app/design-tokens.test.ts webapp/src/app/vocabulary/page.test.tsx webapp/src/app/globals.css
git commit -m "feat: add ambient washi background"
git push origin main
```

Wait for the Git-integrated Vercel Production deployment and verify it reaches `Ready`.

