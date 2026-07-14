# Task 6 Implementer Report: Advanced Grammar Path

## Status

- Authored exactly 30 `advanced` grammar records with the required slugs and global display orders `91..120`.
- The complete curriculum now contains 120 records, with 30 records in each of `foundation`, `core`, `expressions`, and `advanced`.
- Added final-curriculum and close-distinction assertions without editing any earlier grammar path.
- All Japanese examples and Chinese translations/explanations are project-authored; every example is marked `kotonoha-original`.

## Files

- Created `data/content/grammar/tae-kim-advanced.zh.json`.
- Modified `tests/content/test_validate_grammar.py`.
- Created this report. `progress.md` was not edited.

## Official URLs consulted

The current Advanced Topics directory was used to resolve the legacy filenames in the brief. The verified current mappings are:

| Legacy page in brief | Current official page |
| --- | --- |
| `formal.html` | `https://guidetojapanese.org/learn/grammar/formal` |
| `should.html` | `https://guidetojapanese.org/learn/grammar/should` |
| `even.html` | `https://guidetojapanese.org/learn/grammar/even` |
| `signs.html` | `https://guidetojapanese.org/learn/grammar/signs` |
| `feasibility.html` | `https://guidetojapanese.org/learn/grammar/feasibility` |
| `tendency.html` | `https://guidetojapanese.org/learn/grammar/tendency` |
| `volitional2.html` | `https://guidetojapanese.org/learn/grammar/volitional2` |
| `coveredby.html` | `https://guidetojapanese.org/learn/grammar/covered` |
| `closeactions.html` | `https://guidetojapanese.org/learn/grammar/immedate` |
| `othergrammar.html` | `https://guidetojapanese.org/learn/grammar/other` |

`immedate` is the spelling currently used by the official site's own navigation; it is not a project typo.

Additional topic-specific official HTML consulted:

- `https://guidetojapanese.org/learn/grammar/honorific`
- `https://guidetojapanese.org/learn/grammar/reasoning`
- `https://guidetojapanese.org/learn/grammar/genericnouns`
- `https://guidetojapanese.org/learn/grammar/similarity`
- `https://guidetojapanese.org/learn/grammar/nochange`
- `https://guidetojapanese.org/learn/grammar/timeactions`
- `https://guidetojapanese.org/learn/grammar/comparison`
- `https://www.guidetojapanese.org/blog/2014/08/20/%E6%9A%87%E3%81%A4%E3%81%B6%E3%81%97%E3%81%AE%E6%8A%95%E7%A8%BF/`
- `https://www.guidetojapanese.org/blog/2011/07/15/what-im-reading-today/`
- `https://www.guidetojapanese.org/blog/2013/12/04/japanese-study-2013-recap/`
- `https://guidetojapanese.org/completeguide.html`

No PDF, OCR output, third-party Chinese translation, Tatoeba material, or copied Tae Kim prose was used.

## TDD evidence

### RED

After adding the final 120-unit assertions, ran:

```text
.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q
```

Observed the expected curriculum failure before authoring production content:

```text
FAILED test_final_curriculum_has_four_complete_ordered_paths
AssertionError: assert 90 == 120
1 failed, 12 passed
```

### GREEN

After authoring all 30 records and adding explicit close-pair checks, the focused command returned:

```text
14 passed in 0.09s
```

The close-pair assertions cover `わけがない／わけにはいかない`, `さえ／すら／おろか`, `かねる／かねない`, `がち／気味／っぽい`, `まま／っぱなし`, `ところ／ばかり／かける`, `つつ／ながら`, and `に限る／によって／について`.

## Deterministic audit and scans

The full 120-record audit checked total count, exact path counts, global order, ID/source-key derivation, HTTPS official hostname, nonempty original examples/translations, nonempty specific mistake notes, 1–2 resolved relations, and no duplicate expression inside any path.

```text
{'total': 120, 'paths': {'advanced': 30, 'core': 30, 'expressions': 30, 'foundation': 30}, 'orders': [1, 120], 'audit': 'PASS'}
placeholder scan: PASS
prohibited advanced-source/label scan: PASS
```

The prohibited scan covered `JLPT`, `Tatoeba`, `OCR`, `.pdf`, and placeholder text. `git diff --check` also returned cleanly.

## Full Python content suite

Ran once as required:

```text
.venv-content/bin/python -m pytest tests/content -q
3 failed, 54 passed in 0.26s
```

All three failures are in `tests/content/test_build_static_bundle.py` and occur before grammar loading because its vocabulary fixture omits the now-required `tier` field. This is the known static-bundle fixture debt for a later task; Task 6 does not modify that test or vocabulary schema.

## Self-review

- Exact brief slug order and orders `91..120` are asserted by tests.
- IDs and source keys are mechanically tied to each slug.
- Categories and connection forms were reviewed record by record.
- Every advanced example is original Japanese with an original Chinese translation.
- Every mistake note names the concrete form learners are likely to confuse.
- Every record has one or two useful relations that resolve inside the 120-unit curriculum.
- Earlier path JSON files are unchanged.

## Source limitations and concerns — reviewer/controller decision required

The official guide does not directly teach every expression imposed by the brief. These gaps are documented rather than hidden:

- `ものだ` has a natural example on Tae Kim's official author blog, but no dedicated attachment lesson for its habitual/recollective use.
- `ものの` has an official blog example, but no dedicated guide lesson.
- `気味` appears as `食傷気味` in the official 2013 recap, but its attachment rule is not taught there.
- The complete-guide HTML explicitly lists `について` among expressions intentionally left for dictionary/example study; the Chinese explanation here is project-authored.
- No official Tae Kim HTML page located during this task directly teaches the aspect suffix `～かける` or the construction `～に限る`. These two units are project-authored extensions. Their `source_url` values preserve only the brief's closest official chapter-level Tae Kim context (`immedate` and `other`); those pages are not direct textual support for the project-authored explanations.

This limitation is the only unresolved provenance concern and requires reviewer/controller acceptance. The curriculum content remains attributed to the official guide domain and licensed consistently, but these two records need a future approved primary reference if per-expression direct-source coverage becomes mandatory.

## Review remediation: published provenance model

The preceding unresolved-provenance section is superseded by the approved controller direction implemented in this review fix. The root cause was that `GrammarRecord` and the web Zod schema hard-coded one source and one license, leaving no honest published representation for project-authored lessons whose Tae Kim links supplied curriculum context rather than direct lesson support.

The canonical model and TypeScript/Zod mirror now publish:

- `provenance_kind: "direct-source" | "project-authored-extension"`, defaulting to `direct-source` so the 114 existing direct records do not need a mechanical discriminator edit. Pydantic serialization and Zod output both expose the discriminator.
- Optional/nullable `curriculum_context_url` and `provenance_note`; extensions require a nonblank note, while direct records reject extension-only fields. Zod accepts canonical Pydantic `null` output for unset optional fields.
- Conditional validation for source ID, source URL, license, official context hostname, and provenance kind. Mismatched direct/extension combinations are rejected in both Python and TypeScript regression tests.
- Direct entries use `tae-kim-grammar`, an official `guidetojapanese.org` URL, and `cc-by-sa-3.0`. Extensions use `kotonoha-original`, `https://github.com/XXarty/kotonoha`, and `all-rights-reserved`.

The published source catalog, bundle manifest/hashes, attribution files, README, and Sources page now contain both grammar sources. `kotonoha-original` is enabled and labeled `All rights reserved`; no grammar source ID is left unknown to the web repository.

## Extension classification rationale

The six reviewer-identified non-direct or partial mappings are now project-authored extensions:

- `mono-da` and `mono-no`: official author-blog examples provide context but not dedicated attachment lessons.
- `gimi-tendency`: the official recap contains an occurrence but does not teach the attachment rule.
- `kakeru-close-action` and `ni-kagiru`: no direct official Tae Kim lesson was located; the prior chapter links were contextual only.
- `ni-tsuite`: the complete guide lists the expression for outside lookup instead of directly teaching this lesson.

Each record retains its prior official URL only in `curriculum_context_url` and uses the required Chinese note: `本条的中文说明与例句为 KOTONOHA 原创；课程语境链接仅用于定位相关学习背景，并非本语法点的直接课程。` The implementer report acknowledged no additional non-direct mapping beyond these six.

## Grammar review fixes

- `tsutsu-while` now states the same-subject, formal/written contrast accurately: `ながら` makes the first action auxiliary and the latter action primary, whereas `つつ` gives the two actions more equal weight.
- `mono-da` now limits `なものだ` to na-adjective stems and qualifies noun attachment as `Nというものだ／Nであるものだ`.
- Replaced unnatural `長年の専門家` / `多年的专家` with `経験豊富な専門家` / `经验丰富的专家`.
- Removed the weak `zuku-me` → `mama-covering` relation and retained the resolved `dake-shika` comparison.

## Review-fix TDD evidence

RED evidence captured before implementation:

```text
Python model/content assertions: 5 failed, 42 passed
- old license literal rejected cc-by-sa-3.0
- extension fields were forbidden and kotonoha-original was rejected
- provenance_kind was absent
- tsutsu/content assertions failed

Web repository assertions: 5 failed, 2 passed
- old Zod license literal rejected cc-by-sa-3.0

Published source catalog: 1 failed, 2 passed
- kotonoha-original was absent

Canonical null parser regression: 1 failed, 6 passed
- Zod rejected null curriculum_context_url and provenance_note
```

GREEN focused verification:

```text
.venv-content/bin/python -m pytest tests/content/test_models.py tests/content/test_validate_grammar.py tests/content/test_repository_contract.py -q
50 passed in 0.12s

npm test -- --run src/lib/content/repository.test.ts src/app/sources/page.test.tsx
2 files passed; 9 tests passed
```

## Review-fix deterministic audit and scans

```text
{'total': 120, 'paths': {'advanced': 30, 'core': 30, 'expressions': 30, 'foundation': 30}, 'orders': [1, 120], 'direct': 114, 'extensions': 6, 'audit': 'PASS'}
placeholder scan: PASS
prohibited-source scan (JLPT, Tatoeba, OCR, .pdf): PASS
static bundle hash verification: {'grammar': 30, 'invalid': 0, 'kana': 46, 'vocabulary': 2000}
git diff --check: PASS
```

The audit also rechecked stable IDs/source keys, exact global order, 30 records per path, nonempty examples and mistakes, 1–2 resolved relations, unique expressions per path, and every conditional provenance combination.

## Full-suite evidence and remaining migration debt

The required full suites were each run once:

```text
.venv-content/bin/python -m pytest -q
3 failed, 67 passed in 0.27s
```

All three failures remain in `tests/content/test_build_static_bundle.py`: its vocabulary factory still omits the required `tier` field and validation stops before bundle behavior. This is the same pre-existing fixture debt reported above and is outside Task 6.

```text
npm test
7 failed suites, 23 passed suites; 74 tests passed
```

The seven web suites fail during module import because the committed generated vocabulary/grammar files still use the legacy pre-expansion shape (`tier`, `priority_tags`, structured `examples`, grammar `path`, `common_mistakes`, and `related_entries` are absent). Focused repository tests use the current contract and pass. `npm run typecheck` separately reaches two existing detail-page errors where `GrammarEntry` correctly exposes structured `examples` but the page still reads legacy `example_ja`/`example_zh`. These generated-data/UI migrations belong to later tasks and were not changed here.
