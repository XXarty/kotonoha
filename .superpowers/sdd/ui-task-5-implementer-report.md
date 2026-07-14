# UI Task 5 implementer report

## Status

Complete. The home page and the vocabulary/grammar directories now use the approved warm, quiet design language and real repository-derived counts. `.venv-content` was not modified.

## RED evidence

- `npm test -- src/app/page.test.tsx src/app/vocabulary/page.test.tsx src/app/grammar/page.test.tsx`
  - 3 page suites failed as intended: the home had no `今日のことば` region, the vocabulary page had no `日常核心`/`进阶扩展` hierarchy, and grammar still linked five old topic categories (for example `/grammar/basics`) instead of four paths.
- `npm test -- src/components/home-hero.test.tsx src/lib/content/repository.test.ts`
  - `HomeHero` could not be resolved because it did not exist.
  - The repository returned `particles` instead of the expected real `foundation` path and supplied no path metadata/tone.

## Implementation summary

- Added a server-rendered `HomeHero` that consumes the shared `siteCopy`, renders the sole approved H1, and links to vocabulary and grammar without importing public JSON into a client bundle.
- Reordered the home into hero, semantic `今日のことば`, continue/account guidance, three learning entrances, and a final source/count note.
- Reworked `SpecimenWord` into a labelled region backed by `DailyWordCandidate`; it shows its real source and contains no fabricated date or statistic.
- Derived vocabulary, grammar, and kana totals from repository reads (`getVocabularyDirectory`, `getGrammarDirectory`, and `getKanaTable`) rather than target numbers.
- Extended `ContentDirectoryItem` with optional `meta` and `tone`; directory cards now show the exact action `打开这条路径`, use honest localized counts, and no longer contain `OPEN COLLECTION`.
- Grouped grammar repository output by the real `GrammarEntry.path` field and made list reads use the same four paths, so `/grammar/foundation`, `/grammar/core`, `/grammar/expressions`, and `/grammar/advanced` resolve to their real units.
- Added the vocabulary tier introduction (`日常核心` and `进阶扩展`) and redesigned both directories using the existing warm tokens and opaque mist/paper surfaces.
- Added responsive single-column fallbacks, minimum 44px interactive targets, quiet two-pixel hover feedback, and explicit reduced-motion removal of hover displacement.

## Verification

- Focused GREEN: 5 suites, 18 tests passed.
- Full Vitest regression: 31 suites / 135 tests passed; 3 unrelated suites fail while importing the known stale committed generated JSON (details below).
- `npm run lint`: passed.
- `npm run typecheck`: only the two known grammar-detail schema errors remain.
- `git diff --check`: passed.
- Static self-review confirmed: unique home H1; required DOM section order; no fake dates or hard-coded content totals; exact directory hrefs/actions; mobile single-column rules; opaque panels over the opt-in washi texture; reduced-motion displacement disabled.
- Accepted concepts inspected at original resolution:
  - `docs/design-reference/kotonoha-home-approved.png`
  - `docs/design-reference/kotonoha-directory-approved.png`
- Browser screenshot comparison is blocked in this task by the stale generated-content snapshot failing repository validation before page render. The final content publication task is already responsible for replacing that snapshot, after which the UI verification task can perform the required Browser/IAB and screenshot fidelity pass.

## Known issues outside Task 5

- `webapp/src/content/generated/vocabulary.json` is the older 2,000-record shape and lacks `tier`, `priority_tags`, and `examples`.
- `webapp/src/content/generated/grammar.json` is the older 30-record shape and lacks `path`, `examples`, `common_mistakes`, and `related_entries`.
- Because of those stale files, the full test command fails only the three suites that import the live repository (`kana/page`, `daily-word`, and `vocabulary entry`) before their tests can run.
- Typecheck still reports the pre-existing `example_ja` / `example_zh` reads in `src/app/grammar/entry/[slug]/page.tsx`; the model now exposes `examples`.

## Commit

`feat: redesign learning home and directories` (this report is included in that commit)
