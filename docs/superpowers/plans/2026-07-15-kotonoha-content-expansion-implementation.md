# KOTONOHA Content Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the verified static content bundle toward 10,000 vocabulary entries and exactly 120 grammar units while preserving stable IDs, source attribution, deterministic builds, and optional Neon progress compatibility.

**Architecture:** Extend the Python Pydantic models first, then improve JMdict/Kaikki matching and split grammar into four reviewed 30-unit paths. The atomic bundle builder validates all records and emits both application JSON and a compact public search index. The web repository validates the same contract and continues filtering disabled sources before pages, search, daily words, and review hydration.

**Tech Stack:** Python 3.12, Pydantic 2, pykakasi, pytest, JMdict Simplified JSON, Kaikki Chinese Wiktionary JSONL, Next.js 16, TypeScript 5, Zod 4, Vitest.

**Cross-plan order:** Execute Content Expansion Tasks 1–7, then UI Redesign Tasks 1–7, then Content Expansion Tasks 8–10, and finally UI Redesign Task 8. This keeps generated JSON, TypeScript types, detail components, and browser tests synchronized at every integration checkpoint.

## Global Constraints

- Target up to approximately 10,000 verified vocabulary records; publish the actual count when strict matching yields fewer.
- Publish exactly 120 complete grammar units across `foundation`, `core`, `expressions`, and `advanced` paths.
- Preserve all existing `vocabulary:jmdict:<id>` and `grammar:tae-kim:<slug>` IDs.
- Never invent a Chinese gloss, frequency rank, JLPT level, source URL, or example provenance.
- Do not add OCR, PDF-derived data, unlicensed Chinese translations, or Tatoeba in this iteration.
- Vocabulary examples are optional and must be omitted when no reliable example exists.
- Every grammar unit requires at least one Japanese/Chinese example, one common-mistake note, and valid related-entry IDs.
- Keep public content in GitHub static files; Neon stores only accounts, favorites, and learning progress.
- Upstream source files remain ignored and must not be committed.
- Vercel builds must not download upstream data or require `DATABASE_URL` for public content.
- Failed download, parse, validation, or hash verification must leave the previous committed bundle intact.

---

## File Structure

- `scripts/content/models.py`: canonical Python content models.
- `scripts/content/build_vocabulary.py`: full/common JMdict parsing, Kaikki matching, tiers, limits, and rejection counts.
- `scripts/content/validate_grammar.py`: loads four path files and validates 120-unit curriculum invariants.
- `scripts/content/build_search_index.py`: deterministic compact index records.
- `scripts/content/build_static_bundle.py`: validates, hashes, stages, and replaces generated content.
- `data/content/grammar/tae-kim-{foundation,core,expressions,advanced}.zh.json`: 30 reviewed units per path.
- `webapp/src/content/generated/*.json`: committed canonical application content.
- `webapp/public/content/search-index.json`: lazy browser search payload.
- `webapp/src/lib/content/types.ts` and `repository.ts`: TypeScript runtime contract and access APIs.

---

### Task 1: Expand the Canonical Python and TypeScript Models

**Files:**
- Modify: `scripts/content/models.py`
- Modify: `tests/content/test_models.py`
- Modify: `webapp/src/lib/content/types.ts`
- Modify: `webapp/src/lib/content/repository.ts`
- Modify: `webapp/src/lib/content/repository.test.ts`

**Interfaces:**
- Produces: `ExampleRecord`, `VocabularyRecord.tier`, `priority_tags`, and `examples`.
- Produces: `GrammarRecord.path`, `examples`, `common_mistakes`, and `related_entries`.
- Preserves: stable identity validation against source IDs and slugs.

- [ ] **Step 1: Write failing Python model tests**

```python
def test_vocabulary_supports_tier_priority_and_optional_examples():
    record = VocabularyRecord(**vocabulary_payload(
        tier="core",
        priority_tags=["common"],
        examples=[{"ja": "灯をつける。", "zh": "开灯。", "source": "kotonoha-original"}],
    ))
    assert record.tier == "core"
    assert record.examples[0].ja == "灯をつける。"

def test_grammar_requires_path_examples_mistakes_and_valid_related_ids():
    record = GrammarRecord(**grammar_payload(
        path="foundation",
        examples=[{"ja": "私は学生です。", "zh": "我是学生。", "source": "kotonoha-original"}],
        common_mistakes=["名词普通形不能直接省略判断形式。"],
        related_entries=["grammar:tae-kim:wa-topic"],
    ))
    assert record.path == "foundation"
```

- [ ] **Step 2: Run Python tests and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_models.py -q`

Expected: FAIL because the new fields and `ExampleRecord` do not exist.

- [ ] **Step 3: Implement the Pydantic models**

```python
class ExampleRecord(ContentRecord):
    ja: NonBlankText
    zh: NonBlankText
    source: Literal["tae-kim", "kotonoha-original"]

class VocabularyRecord(ContentRecord):
    # existing identity and lexical fields stay unchanged
    tier: Literal["core", "extended"]
    priority_tags: list[NonBlankText] = Field(default_factory=list)
    examples: list[ExampleRecord] = Field(default_factory=list)

class GrammarRecord(ContentRecord):
    # existing identity, source, connection, and explanation fields stay unchanged
    path: Literal["foundation", "core", "expressions", "advanced"]
    examples: list[ExampleRecord] = Field(min_length=1)
    common_mistakes: list[NonBlankText] = Field(min_length=1)
    related_entries: list[str] = Field(default_factory=list)
```

Validate each related ID against `^grammar:tae-kim:[a-z0-9-]+$`; reject a self-reference and duplicate related IDs. Replace scalar `example_ja`, `example_zh`, and `example_source` fields rather than keeping two representations.

- [ ] **Step 4: Mirror the contract in TypeScript and Zod**

```ts
export interface ContentExample {
  ja: string;
  zh: string;
  source: "tae-kim" | "kotonoha-original";
}

export interface VocabularyEntry {
  // existing fields remain
  tier: "core" | "extended";
  priority_tags: string[];
  examples: ContentExample[];
}

export interface GrammarEntry {
  // existing fields remain
  path: "foundation" | "core" | "expressions" | "advanced";
  examples: ContentExample[];
  common_mistakes: string[];
  related_entries: string[];
}
```

Update repository fixtures and search fields to use `examples.flatMap(({ ja, zh }) => [ja, zh])`.

- [ ] **Step 5: Run both model suites**

Run: `.venv-content/bin/python -m pytest tests/content/test_models.py -q`

Run from `webapp/`: `npm test -- src/lib/content/repository.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/content/models.py tests/content/test_models.py webapp/src/lib/content/types.ts webapp/src/lib/content/repository.ts webapp/src/lib/content/repository.test.ts
git commit -m "feat: expand public content contracts"
```

---

### Task 2: Improve JMdict and Kaikki Matching and Add Tiers

**Files:**
- Modify: `scripts/content/build_vocabulary.py`
- Modify: `tests/content/test_build_vocabulary.py`
- Modify: `tests/content/fixtures/jmdict_common.json`
- Modify: `tests/content/fixtures/kaikki_zh.jsonl`

**Interfaces:**
- Consumes: JMdict Simplified roots with either `commonOnly: true` or `false`.
- Produces: `JMdictCandidate(common, priority_tags, japanese, kana, part_of_speech, meaning_en)`.
- Produces: `KaikkiCandidate(word, readings, part_of_speech, glosses)`.
- Produces: `build_vocabulary(..., limit=10000, core_limit=5000)`.

- [ ] **Step 1: Add failing exact-reading, POS-fallback, and tier tests**

```python
def test_exact_spelling_and_reading_disambiguate_kaikki_homographs():
    result = build_vocabulary(FULL_JMDICT, READING_AWARE_KAIKKI, limit=10_000, core_limit=5_000)
    assert result.records[0].meaning_zh == ["桥"]
    assert result.rejection_counts.get("ambiguous_chinese", 0) == 0

def test_common_candidates_are_core_and_extended_candidates_fill_remaining_slots():
    result = build_vocabulary(FULL_JMDICT, READING_AWARE_KAIKKI, limit=3, core_limit=2)
    assert [item.tier for item in result.records] == ["core", "core", "extended"]

def test_missing_reading_requires_unique_spelling_and_compatible_pos():
    result = build_vocabulary(FULL_JMDICT, KAIKKI_WITHOUT_READING, limit=10, core_limit=5)
    assert result.rejection_counts["ambiguous_chinese"] == 1
```

- [ ] **Step 2: Run and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_build_vocabulary.py -q`

Expected: FAIL because matching is keyed only by spelling and the builder has no tiers.

- [ ] **Step 3: Implement reading and POS extraction**

For Kaikki rows, collect normalized readings from `forms[]` when tags contain `hiragana`, `katakana`, `kana`, or `reading`. Normalize the row-level `pos` and sense-level POS strings. Build two indexes:

```python
exact: dict[tuple[str, str], set[KaikkiCandidate]]
spelling_only: dict[str, set[KaikkiCandidate]]
```

Try `(japanese, kana)` first. If absent, spelling-only matching is allowed only when one gloss set remains after POS compatibility. Record `missing_chinese`, `ambiguous_chinese`, `reading_mismatch`, and `pos_mismatch` separately.

- [ ] **Step 4: Implement deterministic tier selection**

Treat a JMdict candidate as core when its chosen kanji or kana item has `common: true`; set `priority_tags` to `['common']` for that case and `[]` otherwise. Sort core and extended pools by `(category, kana, japanese, id)`. Select round-robin across the four categories until `core_limit`, then fill from the extended pool until `limit`. Clamp `core_limit <= limit` and default CLI values to `--limit 10000 --core-limit 5000`.

- [ ] **Step 5: Run deterministic and compressed-input tests**

Run: `.venv-content/bin/python -m pytest tests/content/test_build_vocabulary.py -q`

Expected: PASS, including byte determinism and `.jsonl.gz` streaming.

- [ ] **Step 6: Commit**

```bash
git add scripts/content/build_vocabulary.py tests/content/test_build_vocabulary.py tests/content/fixtures/jmdict_common.json tests/content/fixtures/kaikki_zh.jsonl
git commit -m "feat: tier and disambiguate vocabulary content"
```

---

### Task 3: Migrate the Foundation Grammar Path

**Files:**
- Create: `data/content/grammar/tae-kim-foundation.zh.json`
- Remove: `data/content/grammar/tae-kim-basic.zh.json`
- Modify: `scripts/content/validate_grammar.py`
- Modify: `tests/content/test_validate_grammar.py`

**Interfaces:**
- Produces: `load_grammar_curriculum(path: Path) -> list[GrammarRecord]` for a directory or explicit JSON file.
- Produces: exactly 30 `foundation` entries with display orders `1..30`.

- [ ] **Step 1: Write failing path-aware validator tests**

```python
def test_foundation_path_has_thirty_expanded_entries():
    entries = load_grammar_curriculum(GRAMMAR_DIR)
    foundation = [entry for entry in entries if entry.path == "foundation"]
    assert len(foundation) == 30
    assert [entry.display_order for entry in foundation] == list(range(1, 31))
    assert all(entry.examples and entry.common_mistakes for entry in foundation)
```

- [ ] **Step 2: Run and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q`

Expected: FAIL because the validator accepts only one 30-entry file and old scalar example fields.

- [ ] **Step 3: Convert the existing 30 units**

Keep these stable slugs and IDs in order: `da-desu`, `wa-topic`, `mo-also`, `ga-subject`, `no-possession`, `i-adjectives`, `na-adjectives`, `verb-groups`, `verb-negative`, `past-tense`, `te-form`, `aru-iru`, `wo-object`, `ni-particle`, `e-particle`, `de-particle`, `to-particle`, `kara-made`, `masen-ka`, `tai-desire`, `te-iru`, `te-kudasai`, `te-mo-ii`, `te-wa-ikenai`, `koto-ga-dekiru`, `tsumori`, `to-omou`, `tari-tari`, `ta-koto-ga-aru`, `kara-reason`.

Set `path: "foundation"`; convert each existing example to `examples: [{ ja, zh, source: "kotonoha-original" }]`; add one specific Chinese `common_mistakes` note and one or two valid `related_entries` for every unit. Do not change existing IDs.

- [ ] **Step 4: Implement directory loading and invariant checks**

Load files matching `tae-kim-*.zh.json`, validate every record, then sort the combined records by `display_order`. Reject duplicate IDs/slugs, non-sequential global order, missing paths, self-links, and related IDs absent from the combined set.

- [ ] **Step 5: Run tests and scan content**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q`

Run: `rg -n "TBD|TODO|待补|lorem" data/content/grammar`

Expected: tests PASS and the scan returns no matches.

- [ ] **Step 6: Commit**

```bash
git add data/content/grammar scripts/content/validate_grammar.py tests/content/test_validate_grammar.py
git commit -m "feat: migrate foundation grammar path"
```

---

### Task 4: Author the Core Grammar Path

**Files:**
- Create: `data/content/grammar/tae-kim-core.zh.json`
- Modify: `tests/content/test_validate_grammar.py`

**Interfaces:**
- Produces: 30 `core` units with global display orders `31..60`.

- [ ] **Step 1: Add the failing core-path assertion**

Assert 30 core entries, orders `31..60`, HTTPS source URLs on `guidetojapanese.org`, at least one example and mistake each, and all related IDs resolving in the combined curriculum.

- [ ] **Step 2: Run and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q`

Expected: FAIL with 30 missing core units.

- [ ] **Step 3: Author the exact ordered syllabus**

Use these slugs in order: `polite-masu`, `addressing-people`, `ka-question`, `te-combinations`, `potential-form`, `ni-suru-ni-naru`, `ba-conditional`, `tara-conditional`, `nara-conditional`, `to-conditional`, `nakereba-naranai`, `nakute-mo-ii`, `hoshii-desire`, `tagaru-desire`, `volitional-form`, `to-quotation`, `tte-quotation`, `to-iu-definition`, `you-to-suru`, `te-miru`, `ageru`, `kureru`, `morau`, `kudasai-request`, `nasai-command`, `imperative-form`, `counters`, `relative-clauses`, `transitive-intransitive`, `explanatory-no-da`.

Use the relevant official Tae Kim pages under `completeguide.html`, `potential.html`, `conditionals.html`, `must.html`, `desire.html`, `quotation.html`, `define.html`, `try.html`, `favor.html`, `requests.html`, and `amount.html`. Write concise original Chinese explanations and checked original example pairs; do not copy a third-party Chinese translation.

- [ ] **Step 4: Validate and commit**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q`

Expected: foundation and core assertions PASS.

```bash
git add data/content/grammar/tae-kim-core.zh.json tests/content/test_validate_grammar.py
git commit -m "feat: add core grammar path"
```

---

### Task 5: Author the Common Expressions Grammar Path

**Files:**
- Create: `data/content/grammar/tae-kim-expressions.zh.json`
- Modify: `tests/content/test_validate_grammar.py`

**Interfaces:**
- Produces: 30 `expressions` units with global display orders `61..90`.

- [ ] **Step 1: Add and run the failing 30-unit path assertion**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q`

Expected: FAIL with 30 missing expressions units.

- [ ] **Step 2: Author the exact ordered syllabus**

Use these slugs: `passive-form`, `causative-form`, `causative-passive`, `honorific-verbs`, `humble-verbs`, `te-shimau`, `generic-koto`, `generic-mono`, `wake-explanation`, `hazu-expectation`, `beki-should`, `you-similarity`, `mitai-similarity`, `rashii-similarity`, `sou-appearance`, `sou-hearsay`, `yori-hou-comparison`, `yasui-nikui`, `naide-without`, `nagara-while`, `node-reason`, `noni-contrast`, `toki-time`, `mae-ni-before`, `ato-de-after`, `te-kara-since`, `made-ni-deadline`, `you-ni-naru`, `koto-ni-suru`, `dake-shika`.

Use official pages `causepass.html`, `honorific.html`, `unintended.html`, `genericnouns.html`, `certainty.html`, `similar.html`, `comparison.html`, `easyhard.html`, `negativeverbs2.html`, `reasoning.html`, `timeaction.html`, and `nochangestate.html`.

- [ ] **Step 3: Validate and commit**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q`

Expected: 90 total units validate and all references resolve.

```bash
git add data/content/grammar/tae-kim-expressions.zh.json tests/content/test_validate_grammar.py
git commit -m "feat: add common expressions grammar path"
```

---

### Task 6: Author the Advanced Grammar Path

**Files:**
- Create: `data/content/grammar/tae-kim-advanced.zh.json`
- Modify: `tests/content/test_validate_grammar.py`

**Interfaces:**
- Produces: 30 `advanced` units with global display orders `91..120`.

- [ ] **Step 1: Add and run the final curriculum assertions**

Assert total length 120, global order `1..120`, exactly 30 entries in every path, no duplicate expressions within a path, no dangling related IDs, and no empty example or mistake strings.

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q`

Expected: FAIL with 30 missing advanced units.

- [ ] **Step 2: Author the exact ordered syllabus**

Use these slugs: `formal-de-aru`, `dewa-arumai`, `gozaru`, `wake-ga-nai`, `wake-ni-wa-ikanai`, `mono-da`, `mono-no`, `sae-minimum`, `sura-minimum`, `o-roka`, `garu-signs`, `sou-ni-mieru`, `kaneru`, `kanenai`, `shikata-ga-nai`, `gachi-tendency`, `gimi-tendency`, `ppoi-tendency`, `darou-volitional`, `mashou-ka`, `mama-covering`, `ppanashi`, `zuku-me`, `tokoro-timing`, `bakari-just-finished`, `kakeru-close-action`, `tsutsu-while`, `ni-kagiru`, `ni-yotte`, `ni-tsuite`.

Use official pages `formal.html`, `should.html`, `even.html`, `signs.html`, `feasibility.html`, `tendency.html`, `volitional2.html`, `coveredby.html`, `closeactions.html`, and `othergrammar.html`.

- [ ] **Step 3: Validate, scan, and commit**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py -q`

Run: `rg -n "TBD|TODO|待补|lorem" data/content/grammar`

Expected: 120 units PASS and placeholder scan returns no matches.

```bash
git add data/content/grammar/tae-kim-advanced.zh.json tests/content/test_validate_grammar.py
git commit -m "feat: complete 120-unit grammar curriculum"
```

---

### Task 7: Generate and Verify the Compact Search Index

**Files:**
- Create: `scripts/content/build_search_index.py`
- Create: `tests/content/test_build_search_index.py`
- Modify: `scripts/content/build_static_bundle.py`
- Modify: `tests/content/test_build_static_bundle.py`
- Create: `webapp/public/content/search-index.json`

**Interfaces:**
- Consumes: validated vocabulary, grammar, and kana records.
- Produces: deterministic rows `{id, kind, primary, reading, romaji, meaning, href}`.
- Produces: `build_static_bundle(..., public_dir: Path)` and verifies the public index hash.

- [ ] **Step 1: Write failing index tests**

```python
def test_search_index_is_compact_deterministic_and_route_safe():
    first = build_search_index(vocabulary(), grammar(), kana())
    second = build_search_index(vocabulary(), grammar(), kana())
    assert first == second
    assert first[0].keys() == {"id", "kind", "primary", "reading", "romaji", "meaning", "href"}
    assert "%3A" in next(row["href"] for row in first if row["kind"] == "vocabulary")

def test_bundle_verifies_public_search_index_hash(tmp_path):
    manifest = build_static_bundle(**inputs, output_dir=generated, public_dir=public)
    assert manifest.files["public/content/search-index.json"] == sha256_file(public / "content/search-index.json")
```

- [ ] **Step 2: Run and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_build_search_index.py tests/content/test_build_static_bundle.py -q`

Expected: FAIL because the builder and `public_dir` contract do not exist.

- [ ] **Step 3: Implement deterministic index generation**

Vocabulary maps to its first Chinese gloss; grammar maps to `expression`, first example Japanese text as `reading: ""`, and `explanation_zh`; kana maps its pair to `primary: "あ · ア"`. Sort by `(kind, primary, id)`. Use `urllib.parse.quote(id, safe='')` for vocabulary routes.

- [ ] **Step 4: Extend atomic staging and manifest verification**

Write the public index into a sibling temporary directory, compute its hash before replacing any committed file, validate the application bundle and public index together, replace generated files, then replace the public index last. A failure before the replacement stage must leave both previous locations byte-identical.

- [ ] **Step 5: Run tests and commit**

Run: `.venv-content/bin/python -m pytest tests/content/test_build_search_index.py tests/content/test_build_static_bundle.py -q`

Expected: PASS.

```bash
git add scripts/content/build_search_index.py tests/content/test_build_search_index.py scripts/content/build_static_bundle.py tests/content/test_build_static_bundle.py webapp/public/content/search-index.json
git commit -m "feat: generate lazy public search index"
```

---

### Task 8: Regenerate the Live Vocabulary and Static Bundle

**Files:**
- Modify: `webapp/src/content/generated/vocabulary.json`
- Modify: `webapp/src/content/generated/grammar.json`
- Modify: `webapp/src/content/generated/manifest.json`
- Modify: `webapp/src/content/generated/verification.json`
- Modify: `webapp/src/content/generated/sources.json`
- Modify: `webapp/src/content/generated/ATTRIBUTION.md`
- Modify: `webapp/public/content/search-index.json`
- Modify: `webapp/README.md`

**Interfaces:**
- Consumes: a pinned current JMdict Simplified full English JSON release and the current Kaikki Chinese Wiktionary Japanese-entry JSONL snapshot.
- Produces: actual verified vocabulary count up to 10,000 and exactly 120 grammar units.

- [ ] **Step 1: Download current upstream snapshots without committing them**

Use `scripts/content/fetch_sources.py` with the exact HTTPS asset URLs shown on the current JMdict Simplified GitHub release and Kaikki Chinese Wiktionary raw-data page. Save them under ignored `data/content/upstream/`, record both SHA-256 values in the source metadata, and confirm `git status --short data/content/upstream` prints nothing.

- [ ] **Step 2: Build the 10,000-record candidate bundle**

```bash
.venv-content/bin/python scripts/content/build_vocabulary.py \
  --jmdict data/content/upstream/jmdict-eng-full.json \
  --kaikki data/content/upstream/kaikki-zh.jsonl.gz \
  --limit 10000 \
  --core-limit 5000 \
  --output data/content/build/vocabulary.json \
  --rejections data/content/build/rejections.json
```

Expected: JSON output reports an actual published count no greater than 10,000 and named rejection counts. Do not treat a count below 10,000 as failure when all quality checks pass.

- [ ] **Step 3: Build the complete static release**

Run `validate_grammar.py` against `data/content/grammar/`, then run `build_static_bundle.py` with the vocabulary build, grammar directory, kana seed, pinned source metadata, rejection file, `webapp/src/content/generated`, and `webapp/public`.

Expected manifest counts: actual vocabulary count, `grammar: 120`, `kana: 46`, `invalid: 0`.

- [ ] **Step 4: Verify release evidence and repository size**

Run: `.venv-content/bin/python scripts/content/build_static_bundle.py --verify webapp/src/content/generated --public-dir webapp/public`

Run: `.venv-content/bin/python -m pytest tests/content -q`

Run: `git diff --check`

Inspect file sizes with `du -h webapp/src/content/generated/vocabulary.json webapp/public/content/search-index.json`; if the public index exceeds 3 MB uncompressed, reduce meanings to the first 80 Unicode characters without dropping IDs or routes.

- [ ] **Step 5: Update documentation and commit generated evidence**

Update the README with actual counts, snapshot dates, rebuild commands, rejection categories, and the rule that upstream files remain ignored.

```bash
git add webapp/src/content/generated webapp/public/content/search-index.json webapp/README.md
git commit -m "data: expand verified japanese learning content"
```

---

### Task 9: Integrate Expanded Contracts in the Web Repository

**Files:**
- Modify: `webapp/src/lib/content/repository.ts`
- Modify: `webapp/src/lib/content/repository.test.ts`
- Modify: `webapp/src/app/grammar/page.test.tsx`
- Modify: `webapp/src/app/grammar/[category]/page.tsx`
- Modify: `webapp/src/app/grammar/[category]/page.test.tsx`
- Modify: `webapp/src/lib/actions/study.test.ts`

**Interfaces:**
- Consumes: expanded generated JSON from Task 8.
- Produces: grammar directory grouped by `path`, stable related-entry resolution, tier-filtered vocabulary lists, and review hydration for old IDs.

- [ ] **Step 1: Write failing repository assertions**

Assert four grammar directory items in path order, tier-filtered vocabulary counts, related entry lookup omitting disabled or missing records, and hydration of an existing `vocabulary:jmdict:<id>` progress row after the expanded snapshot.

- [ ] **Step 2: Run and confirm RED**

Run from `webapp/`: `npm test -- src/lib/content/repository.test.ts src/app/grammar/page.test.tsx 'src/app/grammar/[category]/page.test.tsx' src/lib/actions/study.test.ts`

Expected: FAIL because grammar is grouped by old categories and tier filtering is absent.

- [ ] **Step 3: Implement path ordering and related lookup**

Use the order `foundation`, `core`, `expressions`, `advanced` with Chinese labels `基础`, `核心`, `常用表达`, `进阶`. Sort grammar lists by `display_order`. Add `getRelatedGrammar(ids: readonly string[])` that maps through `itemMap`, filters to enabled grammar items, and preserves requested order.

- [ ] **Step 4: Run web tests and commit**

Run: `npm test -- src/lib/content/repository.test.ts src/app/grammar/page.test.tsx 'src/app/grammar/[category]/page.test.tsx' src/lib/actions/study.test.ts`

Expected: PASS.

```bash
git add webapp/src/lib/content/repository.ts webapp/src/lib/content/repository.test.ts webapp/src/app/grammar/page.test.tsx 'webapp/src/app/grammar/[category]/page.tsx' 'webapp/src/app/grammar/[category]/page.test.tsx' webapp/src/lib/actions/study.test.ts
git commit -m "feat: expose expanded learning paths"
```

---

### Task 10: Run Full Provenance and Production Verification

**Files:**
- Modify: `tests/content/test_repository_contract.py`
- Modify: `webapp/e2e/mvp.spec.ts`
- Modify: `docs/PRD.md`

**Interfaces:**
- Consumes: complete content and UI plans.
- Produces: release evidence that content counts, hashes, source switches, UI routes, and optional Neon paths are consistent.

- [ ] **Step 1: Add final contract tests**

Assert generated vocabulary count equals manifest count and is `<= 10000`; grammar count is `120`; kana count is `46`; public search index IDs are a subset of enabled generated content IDs; no retired OCR modules exist; no upstream files are tracked; disabling each source removes its content from directory, search, daily words, and review hydration.

- [ ] **Step 2: Run the complete local matrix**

Run from repository root: `.venv-content/bin/python -m pytest tests/content -q`

Run from `webapp/`: `npm test`

Run: `npm run lint`

Run: `npm run typecheck`

Run without auth/database variables: `env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL -u NEXT_PUBLIC_APP_URL npm run build`

Run: `npm run test:e2e`

Expected: every command PASS and public routes build without Neon.

- [ ] **Step 3: Update the PRD with actual shipped counts**

Replace MVP 2,000/30 descriptions with actual verified vocabulary count and 120 grammar units. Keep the noncommercial Tae Kim constraint, GitHub static-content architecture, and Neon user-data-only rule.

- [ ] **Step 4: Commit final release evidence**

```bash
git add tests/content/test_repository_contract.py webapp/e2e/mvp.spec.ts docs/PRD.md
git commit -m "test: verify expanded content release"
```

- [ ] **Step 5: Deploy and inspect a Vercel Preview**

Run from `webapp/`: `vercel deploy . -y`

Expected: Preview build is Ready and uses the existing project. Inspect deployment status and runtime errors through Vercel CLI; do not promote to Production until the user approves the preview.
