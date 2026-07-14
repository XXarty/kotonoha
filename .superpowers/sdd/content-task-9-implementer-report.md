# Content Task 9 Implementer Report

## Scope

- Baseline: `c3ce0c9`
- Preserved the UI5 route shape at `app/grammar/[path]`; no `[category]` route was introduced.
- Left `.venv-content` untouched and did not modify generated content.

## TDD evidence

The first focused run added contract tests before production changes and produced four expected failures:

- reversed grammar fixtures returned display orders `[6, 5, 4]` instead of `[4, 5, 6]`;
- `getRelatedGrammar` did not exist;
- grammar detail did not call the repository relation API;
- an initial zero-count-directory expectation exposed a contract conflict and was corrected before GREEN to retain the existing enabled-source behavior (zero-count paths remain omitted).

The corrected source-switch regression now explicitly asserts that a disabled-source-only path is absent.

## Implementation

- Declared the four grammar paths in explicit `foundation`, `core`, `expressions`, `advanced` order with the established Chinese labels and descriptions.
- Made `getGrammarList(path)` sort by `display_order` after enabled-source filtering; unknown paths return `[]`.
- Added and exported `getRelatedGrammar(ids)`. It resolves only enabled grammar records through the repository `itemMap`, ignores missing/non-grammar/disabled records, and de-duplicates repeated IDs by first occurrence while preserving request order.
- Updated the grammar detail server component to call `getRelatedGrammar` instead of looping over `getContentItem`.
- Added live-bundle regressions for 10,000 vocabulary entries (5,000 `core`, 5,000 `extended`) and 120 grammar units (30 in each path).
- Added committed-evidence compatibility checks using the pre-expansion pins and retirement manifest. The current first retained example is `vocabulary:jmdict:1000510`; the current first retired `pos_mismatch` example is `vocabulary:jmdict:1000470`. Tests select from evidence rather than relying on arbitrary IDs.
- Verified retained rows hydrate and can be rated, while retired rows remain stored inputs but safely hydrate to no public item and cannot be rated or recreated.

## Verification

- Focused suites: 6 files, 36 tests passed.
- Full `npm test`: 40 files, 196 tests passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
