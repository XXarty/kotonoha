# KOTONOHA Static Public-Content MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abandoned PDF/OCR path with a source-attributed static vocabulary and grammar bundle committed to GitHub, then ship a responsive Vercel-ready learning MVP whose only Neon data is authentication and user progress.

**Architecture:** An offline Python pipeline downloads pinned public sources into an ignored workspace, validates and matches them, then atomically generates small versioned JSON files under `webapp/src/content/generated/`. Next.js imports those files through a typed in-memory repository for directories, details, search, daily content, and review hydration. Stable string content IDs connect static items to Neon progress and favorite rows without storing public content in Neon.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript 5, Tailwind CSS 4, Zod 4, Drizzle ORM 0.45+, Neon PostgreSQL, Better Auth 1.6.23, Vitest 4, Playwright 1.61+, Python 3.12, Pydantic 2, pykakasi, JMdict Simplified common JSON, Kaikki Chinese Wiktionary JSONL.

## Global Constraints

- Keep the site noncommercial while Tae Kim-derived CC BY-NC-SA 3.0 content is enabled: no ads, paid access, subscriptions, sponsorship placement, or other monetization.
- Do not OCR, parse, import, or publish the DK or Teikyo PDFs; do not preserve their hierarchy, pages, or numbering.
- Do not label content as an official JLPT list without a separately verified licensed source.
- Publish only vocabulary with Japanese text, kana, POS, at least one reliable Chinese gloss, and complete provenance.
- Reject ambiguous Chinese matches instead of guessing.
- Commit only the validated starter bundle, aggregate rejection statistics, manifest, and attribution; ignore full upstream sources and build scratch files.
- Vercel builds must not download dictionaries or require Neon for public browsing/search.
- Public content IDs are stable strings. Existing Neon `item_id` columns become text and never use client-supplied user IDs or review dates.
- Source disablement is controlled by `webapp/src/content/generated/sources.json` and takes effect after redeployment.
- Minimum launch bundle: 500 vocabulary entries and exactly 30 grammar entries; target approximately 2,000 vocabulary entries.
- Read the relevant local Next.js 16 documentation under `webapp/node_modules/next/dist/docs/` before implementing App Router pages or Server Actions.

---

## File Map

### Offline generator

- `scripts/content/models.py`: normalized public content and manifest models.
- `scripts/content/fetch_sources.py`: allowlisted atomic downloads and SHA-256 capture.
- `scripts/content/build_vocabulary.py`: JMdict selection, Kaikki matching, romaji, classification, and rejection counts.
- `scripts/content/validate_grammar.py`: validates the fixed 30-unit Tae Kim-derived seed.
- `scripts/content/validate_kana.py`: validates the 46 factual basic hiragana/katakana pairs.
- `scripts/content/build_static_bundle.py`: writes deterministic JSON files and manifest into the web app.
- `data/content/grammar/tae-kim-basic.zh.json`: reviewed grammar authoring source.
- `data/content/kana/gojuon.json`: project-authored CC0 basic kana table.
- `data/content/upstream/`, `data/content/build/`: ignored upstream and scratch data.
- `tests/content/fixtures/`: tiny license-compatible test fixtures.

### Generated GitHub content

- `webapp/src/content/generated/sources.json`: source URLs, licenses, versions, hashes, and enabled flags.
- `webapp/src/content/generated/vocabulary.json`: validated starter vocabulary.
- `webapp/src/content/generated/grammar.json`: 30 validated grammar units.
- `webapp/src/content/generated/kana.json`: 46 basic hiragana/katakana pairs.
- `webapp/src/content/generated/manifest.json`: generator version, counts, file hashes, and rejection counts.
- `webapp/src/content/generated/ATTRIBUTION.md`: redistribution and modification notices.

### Web application

- `webapp/src/lib/content/types.ts`: static content, source, and route view models.
- `webapp/src/lib/content/repository.ts`: validated in-memory content access, search, source filtering, and progress hydration.
- `webapp/src/lib/content/routes.ts`: canonical content URLs.
- `webapp/src/lib/db/schema.ts`: text progress/favorite IDs; legacy content tables remain unused for migration safety.
- `webapp/src/lib/db/queries.ts`: user-progress queries only; no public content reads.
- `webapp/src/lib/actions/study.ts`, `favorites.ts`: authenticated user-data mutations checked against static content.
- `webapp/src/components/`: site shell, content lists, specimen card, and rating controls.
- `webapp/src/app/`: home, vocabulary, grammar, search, review, sources, auth, and profile routes.
- `webapp/e2e/mvp.spec.ts`: launch-path browser verification.

---

### Task 1: Retire OCR and Database Content Import Contracts

**Files:**
- Delete: `scripts/content/extract_dk.py`
- Delete: `scripts/content/extract_grammar.py`
- Delete: `scripts/content/translate_zh.py`
- Delete: `scripts/content/import_to_neon.py`
- Delete: `tests/content/test_extract_dk.py`
- Delete: `tests/content/test_extract_grammar.py`
- Delete: `tests/content/test_translate_zh.py`
- Delete: `tests/content/test_import_to_neon.py`
- Delete: `tests/content/fixtures/dk_page.json`
- Modify: `.gitignore`
- Modify: `scripts/content/requirements.txt`
- Modify: `docs/PRD.md`
- Modify: `docs/superpowers/plans/2026-07-14-kotonoha-implementation.md`
- Create: `tests/content/test_repository_contract.py`

**Interfaces:**
- Consumes: approved static-content design.
- Produces: an OCR-free and Neon-content-free repository boundary.

- [ ] **Step 1: Write the failing repository contract test**

```python
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_retired_content_modules_do_not_exist() -> None:
    retired = {
        "extract_dk.py", "extract_grammar.py", "translate_zh.py", "import_to_neon.py"
    }
    present = {path.name for path in (ROOT / "scripts/content").glob("*.py")}
    assert retired.isdisjoint(present)
```

- [ ] **Step 2: Run it to confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_repository_contract.py -q`

Expected: FAIL because the retired scripts still exist.

- [ ] **Step 3: Remove retired modules and update project contracts**

Set `scripts/content/requirements.txt` to:

```text
pydantic>=2.10,<3
pykakasi>=2.3,<3
pytest>=8.3,<9
```

Add to `.gitignore`:

```gitignore
work/
data/content/upstream/
data/content/build/
*.pdf
```

Rewrite active PRD references so public content is bundled from GitHub, Neon stores only user data, and JLPT remains deferred. Add a supersession banner to the old OCR implementation plan pointing to this plan.

- [ ] **Step 4: Run all surviving content tests**

Run: `.venv-content/bin/python -m pytest tests/content -q`

Expected: PASS with no OCR, PDF, machine-translation, or database-import dependencies.

- [ ] **Step 5: Commit**

```bash
git add .gitignore scripts/content tests/content docs/PRD.md docs/superpowers/plans/2026-07-14-kotonoha-implementation.md
git commit -m "refactor: retire OCR and Neon content paths"
```

---

### Task 2: Define Source-Neutral Static Content Models

**Files:**
- Modify: `scripts/content/models.py`
- Modify: `tests/content/test_models.py`
- Create: `tests/content/fixtures/grammar_seed.json`

**Interfaces:**
- Consumes: JSON-compatible public source values.
- Produces: `VocabularyRecord`, `GrammarRecord`, `ContentSource`, `SourceSnapshot`, `BuildManifest`, `normalize_text()`, and stable ID helpers.

- [ ] **Step 1: Write failing model tests**

```python
def test_vocabulary_has_stable_string_id_and_complete_provenance() -> None:
    record = VocabularyRecord(
        id="vocabulary:jmdict:1000001",
        source_id="jmdict-kaikki",
        source_key="jmdict:1000001",
        category="verbs",
        list_name="common-verbs",
        japanese="食べる",
        kana="たべる",
        romaji="taberu",
        part_of_speech=["verb"],
        meaning_zh=["吃"],
        meaning_en=["to eat"],
        meaning_zh_source="kaikki-zhwiktionary",
        content_version="2026-07-13",
        published=True,
    )
    assert record.id == "vocabulary:jmdict:1000001"


def test_vocabulary_rejects_empty_chinese_gloss() -> None:
    with pytest.raises(ValidationError):
        VocabularyRecord.model_validate({"meaning_zh": []})


def test_manifest_rejects_incorrect_sha256() -> None:
    with pytest.raises(ValidationError):
        SourceSnapshot(sha256="not-a-hash", **SOURCE_FIELDS)
```

- [ ] **Step 2: Run and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_models.py -q`

Expected: FAIL because page/number-based OCR models still exist.

- [ ] **Step 3: Implement the exact static contracts**

```python
class VocabularyRecord(ContentRecord):
    kind: Literal["vocabulary"] = "vocabulary"
    id: str = Field(pattern=r"^vocabulary:jmdict:[0-9]+$")
    source_id: Literal["jmdict-kaikki"]
    source_key: str = Field(pattern=r"^jmdict:[0-9]+$")
    category: Literal["nouns", "verbs", "adjectives", "other"]
    list_name: str
    japanese: str = Field(min_length=1)
    kana: str = Field(min_length=1)
    romaji: str = Field(min_length=1)
    part_of_speech: list[str] = Field(min_length=1)
    meaning_zh: list[str] = Field(min_length=1)
    meaning_en: list[str] = Field(min_length=1)
    meaning_zh_source: Literal["kaikki-zhwiktionary"]
    content_version: str
    published: Literal[True]


class GrammarRecord(ContentRecord):
    kind: Literal["grammar"] = "grammar"
    id: str = Field(pattern=r"^grammar:tae-kim:[a-z0-9-]+$")
    source_id: Literal["tae-kim-grammar"]
    source_key: str = Field(pattern=r"^tae-kim:[a-z0-9-]+$")
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    category: str
    list_name: str
    expression: str
    connection: str
    explanation_zh: str
    example_ja: str
    example_zh: str
    source_url: str
    example_source: Literal["tae-kim", "kotonoha-original"]
    license_key: Literal["cc-by-nc-sa-3.0"]
    content_version: str
    display_order: int = Field(gt=0)
    published: Literal[True]


class KanaRecord(ContentRecord):
    kind: Literal["kana"] = "kana"
    id: str = Field(pattern=r"^kana:gojuon:[a-z]+$")
    source_id: Literal["kotonoha-kana"]
    hiragana: str = Field(min_length=1)
    katakana: str = Field(min_length=1)
    romaji: str = Field(pattern=r"^[a-z]+$")
    row_group: str = Field(min_length=1)
    display_order: int = Field(gt=0)
    published: Literal[True]
```

Add source and manifest models with HTTPS URLs, 64-character lowercase SHA-256 fields, counts `>= 0`, and `enabled: bool`. Keep NFKC whitespace normalization and remove all page/number/confidence assumptions.

- [ ] **Step 4: Run model tests and confirm GREEN**

Run: `.venv-content/bin/python -m pytest tests/content/test_models.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/content/models.py tests/content/test_models.py tests/content/fixtures/grammar_seed.json
git commit -m "feat: define static public content contracts"
```

---

### Task 3: Fetch and Match JMdict with Kaikki Chinese Wiktionary

**Files:**
- Create: `scripts/content/fetch_sources.py`
- Create: `scripts/content/build_vocabulary.py`
- Create: `tests/content/test_fetch_sources.py`
- Create: `tests/content/test_build_vocabulary.py`
- Create: `tests/content/fixtures/jmdict_common.json`
- Create: `tests/content/fixtures/kaikki_zh.jsonl`

**Interfaces:**
- Consumes: JMdict Simplified `{dictDate, commonOnly, words[]}` and Kaikki JSONL rows with `lang_code`, `word`, and `senses[].glosses`.
- Produces: verified upstream snapshots, `select_jmdict_candidates()`, `index_kaikki_glosses()`, `build_vocabulary()`, vocabulary JSON, and aggregate rejection counts.

- [ ] **Step 1: Write failing download and match tests**

```python
def test_downloader_rejects_unknown_host(tmp_path):
    with pytest.raises(ValueError, match="not allowlisted"):
        download_source("https://example.com/data.json", tmp_path / "data.json")


def test_match_publishes_unique_gloss_and_rejects_ambiguous_homograph(fixtures):
    result = build_vocabulary(fixtures.jmdict, fixtures.kaikki, limit=500)
    assert result.records[0].meaning_zh == ["吃", "进食"]
    assert result.rejection_counts["ambiguous_chinese"] == 1


def test_matching_is_byte_deterministic(fixtures):
    assert build_vocabulary(*fixtures.paths, limit=500).json_bytes() == \
        build_vocabulary(*fixtures.paths, limit=500).json_bytes()
```

- [ ] **Step 2: Run and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_fetch_sources.py tests/content/test_build_vocabulary.py -q`

Expected: FAIL because the downloader and builder do not exist.

- [ ] **Step 3: Implement verified source handling and deterministic matching**

Allow only `github.com`, `objects.githubusercontent.com`, and `kaikki.org`. Stream to a `.part` file, hash during download, and replace the destination only after optional expected-hash verification.

For each JMdict common word, choose the first common kanji spelling (or first kanji/first kana), then the first common compatible kana. Use the first sense with English glosses and POS. Scan Kaikki line by line, retain only `lang_code == "ja"` and wanted normalized spellings, flatten nonempty `senses[].glosses`, and accept only one unique normalized gloss set per spelling. Generate Hepburn romaji with one configured `pykakasi` converter. Map POS explicitly to `nouns`, `verbs`, `adjectives`, or `other`. Sort by `(category, kana, japanese, id)` before `--limit`.

CLI:

```bash
python scripts/content/build_vocabulary.py \
  --jmdict data/content/upstream/jmdict-eng-common.json \
  --kaikki data/content/upstream/kaikki-zh.jsonl \
  --limit 2000 \
  --output data/content/build/vocabulary.json \
  --rejections data/content/build/rejections.json
```

- [ ] **Step 4: Run focused tests and fixture CLI**

Run: `.venv-content/bin/python -m pytest tests/content/test_fetch_sources.py tests/content/test_build_vocabulary.py -q`

Run the CLI against fixtures and expect valid JSON with one published record, explicit missing/ambiguous counts, and no network access.

- [ ] **Step 5: Commit**

```bash
git add scripts/content/fetch_sources.py scripts/content/build_vocabulary.py tests/content/test_fetch_sources.py tests/content/test_build_vocabulary.py tests/content/fixtures
git commit -m "feat: generate attributed common vocabulary"
```

---

### Task 4: Author and Validate Grammar and Kana Seeds

**Files:**
- Create: `data/content/grammar/tae-kim-basic.zh.json`
- Create: `data/content/grammar/ATTRIBUTION.md`
- Create: `scripts/content/validate_grammar.py`
- Create: `tests/content/test_validate_grammar.py`
- Create: `data/content/kana/gojuon.json`
- Create: `data/content/kana/ATTRIBUTION.md`
- Create: `scripts/content/validate_kana.py`
- Create: `tests/content/test_validate_kana.py`

**Interfaces:**
- Consumes: reviewed JSON records based on official Tae Kim pages.
- Produces: exactly 30 unique source-linked `GrammarRecord` objects and 46 unique project-authored `KanaRecord` objects.

- [ ] **Step 1: Write the failing validator test**

```python
def test_launch_seed_has_thirty_complete_unique_entries(seed_path):
    entries = validate_grammar_seed(seed_path)
    assert len(entries) == 30
    assert len({entry.slug for entry in entries}) == 30
    assert [entry.display_order for entry in entries] == list(range(1, 31))
    assert all(entry.source_url.startswith("https://guidetojapanese.org/") for entry in entries)


def test_gojuon_has_forty_six_unique_basic_pairs(kana_path):
    entries = validate_kana_seed(kana_path)
    assert len(entries) == 46
    assert len({entry.hiragana for entry in entries}) == 46
    assert len({entry.katakana for entry in entries}) == 46
    assert [entry.display_order for entry in entries] == list(range(1, 47))
```

- [ ] **Step 2: Run and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py tests/content/test_validate_kana.py -q`

Expected: FAIL because the seed and validator are missing.

- [ ] **Step 3: Create the reviewed syllabus**

Create exactly these slugs in order: `da-desu`, `wa-topic`, `mo-also`, `ga-subject`, `no-possession`, `i-adjectives`, `na-adjectives`, `verb-groups`, `verb-negative`, `past-tense`, `te-form`, `aru-iru`, `wo-object`, `ni-particle`, `e-particle`, `de-particle`, `to-particle`, `kara-made`, `masen-ka`, `tai-desire`, `te-iru`, `te-kudasai`, `te-mo-ii`, `te-wa-ikenai`, `koto-ga-dekiru`, `tsumori`, `to-omou`, `tari-tari`, `ta-koto-ga-aru`, `kara-reason`.

Every record includes a concise original Chinese adaptation, connection rule, checked Japanese/Chinese example pair, official source URL, modification provenance, `license_key: "cc-by-nc-sa-3.0"`, and stable ID `grammar:tae-kim:<slug>`. Do not copy an unlicensed third-party Chinese translation.

Create the 46 modern basic gojūon pairs from `あ/ア/a` through `ん/ン/n`, with stable IDs `kana:gojuon:<romaji>`, row groups, and sequential display order. Release this project-authored factual table under CC0 1.0; do not add voiced or contracted sounds to the first-launch count.

- [ ] **Step 4: Validate content and scan placeholders**

Run: `.venv-content/bin/python -m pytest tests/content/test_validate_grammar.py tests/content/test_validate_kana.py -q`

Run: `rg -n "TBD|TODO|待补|lorem" data/content/grammar data/content/kana`

Expected: tests PASS and placeholder scan returns no matches.

- [ ] **Step 5: Commit**

```bash
git add data/content/grammar data/content/kana scripts/content/validate_grammar.py scripts/content/validate_kana.py tests/content/test_validate_grammar.py tests/content/test_validate_kana.py
git commit -m "feat: add grammar and kana syllabuses"
```

---

### Task 5: Generate and Verify the GitHub Content Bundle

**Files:**
- Replace: `scripts/content/build_manifest.py`
- Create: `scripts/content/build_static_bundle.py`
- Modify: `tests/content/test_manifest.py`
- Create: `tests/content/test_build_static_bundle.py`
- Create: `webapp/src/content/generated/sources.json`
- Create: `webapp/src/content/generated/vocabulary.json`
- Create: `webapp/src/content/generated/grammar.json`
- Create: `webapp/src/content/generated/kana.json`
- Create: `webapp/src/content/generated/manifest.json`
- Create: `webapp/src/content/generated/ATTRIBUTION.md`

**Interfaces:**
- Consumes: validated vocabulary build, grammar seed, source snapshot hashes, and aggregate rejection counts.
- Produces: deterministic atomic generated files whose manifest hashes match their bytes.

- [ ] **Step 1: Write failing atomic bundle tests**

```python
def test_bundle_requires_launch_minimums(tmp_path, small_build):
    with pytest.raises(ValueError, match="at least 500 vocabulary"):
        build_static_bundle(small_build, output_dir=tmp_path)


def test_bundle_manifest_hashes_match_files(tmp_path, launch_build):
    manifest = build_static_bundle(launch_build, output_dir=tmp_path)
    assert manifest.files["vocabulary.json"] == sha256_file(tmp_path / "vocabulary.json")
    assert manifest.counts == {"vocabulary": 500, "grammar": 30, "kana": 46}


def test_failed_validation_does_not_replace_previous_bundle(tmp_path, invalid_build):
    previous = write_previous_bundle(tmp_path)
    with pytest.raises(ValidationError):
        build_static_bundle(invalid_build, output_dir=tmp_path)
    assert (tmp_path / "manifest.json").read_bytes() == previous
```

- [ ] **Step 2: Run and confirm RED**

Run: `.venv-content/bin/python -m pytest tests/content/test_manifest.py tests/content/test_build_static_bundle.py -q`

Expected: FAIL because PDF manifest assumptions remain and bundle builder is missing.

- [ ] **Step 3: Implement canonical JSON and directory-level atomic replacement**

Write UTF-8 JSON with `ensure_ascii=False`, `sort_keys=True`, `indent=2`, and one final newline. Validate all records before creating a sibling temporary directory; calculate hashes from final bytes; write `manifest.json` last; then replace individual generated files only after the entire temp bundle passes re-read validation. Include source name, URL, license URL, snapshot date/hash, and `enabled` in `sources.json`.

CLI:

```bash
python scripts/content/build_static_bundle.py \
  --vocabulary data/content/build/vocabulary.json \
  --grammar data/content/grammar/tae-kim-basic.zh.json \
  --kana data/content/kana/gojuon.json \
  --source-snapshots data/content/build/source-snapshots.json \
  --rejections data/content/build/rejections.json \
  --output webapp/src/content/generated
```

- [ ] **Step 4: Build the real starter bundle and verify it**

Run the real public-source build. If matching produces fewer than 500 reliable Chinese entries, do not lower the acceptance threshold or fabricate glosses; expand only with another verified CC-compatible Chinese source or report the blocker.

Run: `.venv-content/bin/python scripts/content/build_static_bundle.py ...`

Expected: `manifest.json` reports vocabulary `>= 500`, grammar `30`, kana `46`, invalid `0`, and hashes matching every generated file.

- [ ] **Step 5: Commit**

```bash
git add scripts/content/build_manifest.py scripts/content/build_static_bundle.py tests/content/test_manifest.py tests/content/test_build_static_bundle.py webapp/src/content/generated
git commit -m "feat: add verified static starter bundle"
```

---

### Task 6: Implement the Typed Static Content Repository

**Files:**
- Modify: `webapp/src/lib/content/types.ts`
- Create: `webapp/src/lib/content/routes.ts`
- Create: `webapp/src/lib/content/repository.ts`
- Create: `webapp/src/lib/content/repository.test.ts`
- Modify: `webapp/src/lib/study/daily-word.ts`
- Modify: `webapp/src/lib/study/daily-word.test.ts`

**Interfaces:**
- Consumes: generated JSON files.
- Produces: `getVocabularyDirectory()`, `getVocabularyList()`, `getVocabularyEntry()`, `getGrammarDirectory()`, `getGrammarEntry()`, `getKanaTable()`, `searchContent()`, `getDailyWordCandidates()`, `getSourceAttributions()`, `isPublicContentId()`, and `hydrateReviewQueue()`.

- [ ] **Step 1: Write failing repository behavior tests**

```typescript
it("filters disabled sources everywhere", () => {
  const repository = createContentRepository(fixtures({ sourceEnabled: false }));
  expect(repository.getVocabularyDirectory()).toEqual([]);
  expect(repository.searchContent("食べる").vocabulary).toEqual([]);
  expect(repository.getDailyWordCandidates()).toEqual([]);
});

it("normalizes NFKC search across Japanese, kana, romaji, and Chinese", () => {
  const repository = createContentRepository(fixtures());
  expect(repository.searchContent("  ＴＡＢＥＲＵ ").vocabulary[0].id)
    .toBe("vocabulary:jmdict:1000001");
});

it("hydrates due progress and silently omits missing static items", () => {
  expect(repository.hydrateReviewQueue(progressRows)).toEqual([expectedVocabulary]);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/lib/content/repository.test.ts src/lib/study/daily-word.test.ts`

Expected: FAIL because public reads still query Neon and static repository is missing.

- [ ] **Step 3: Implement the repository and routes**

Import generated JSON at module scope, validate once with Zod, construct immutable `Map<string, item>` and grouped arrays, and exclude records whose source is disabled. Normalize search with `input.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ja")`. Limit each result kind to 50.

Canonical routes:

```typescript
export const contentRoute = {
  vocabularyList: (category: string) => `/vocabulary/${category}`,
  vocabularyEntry: (id: string) => `/vocabulary/entry/${encodeURIComponent(id)}`,
  grammarList: (category: string) => `/grammar/${category}`,
  grammarEntry: (slug: string) => `/grammar/entry/${slug}`,
} as const;
```

Change daily-word candidates to come from the repository while preserving deterministic date selection.

- [ ] **Step 4: Run content and study tests**

Run: `npm test -- src/lib/content src/lib/study`

Expected: PASS with no database mock required for public content.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/lib/content webapp/src/lib/study/daily-word.ts webapp/src/lib/study/daily-word.test.ts
git commit -m "feat: serve content from static repository"
```

---

### Task 7: Convert Neon Progress IDs to Text and Add Safe User Actions

**Files:**
- Modify: `webapp/src/lib/db/schema.ts`
- Modify: `webapp/src/lib/db/schema.test.ts`
- Modify: `webapp/src/lib/db/queries.ts`
- Modify: `webapp/src/lib/db/queries.test.ts`
- Create: `webapp/drizzle/0003_text_content_ids.sql`
- Modify: Drizzle metadata generated for migration 0003.
- Create: `webapp/src/lib/actions/study.ts`
- Create: `webapp/src/lib/actions/study.test.ts`
- Create: `webapp/src/lib/actions/favorites.ts`
- Create: `webapp/src/lib/actions/favorites.test.ts`

**Interfaces:**
- Consumes: stable static IDs, `isPublicContentId()`, `requireUser()`, and existing `rateReview()`.
- Produces: text `item_id` storage, due progress rows, and authenticated rating/favorite mutations.

- [ ] **Step 1: Read local Server Actions docs and write failing tests**

Find docs with `rg -l "Server Actions" webapp/node_modules/next/dist/docs/01-app`.

```typescript
it("stores progress item IDs as text", () => {
  expect(getTableColumns(userItemProgress).itemId.dataType).toBe("string");
});

it("rejects a rating for a nonexistent static item", async () => {
  await expect(rateStudyAction({ itemId: "vocabulary:jmdict:missing", rating: "known" }))
    .rejects.toThrow("content item not found");
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/lib/db/schema.test.ts src/lib/db/queries.test.ts src/lib/actions`

Expected: FAIL because item IDs are UUID columns and actions are missing.

- [ ] **Step 3: Implement text migration, progress queries, and actions**

Change `userItemProgress.itemId` and `favorites.itemId` from `uuid()` to `text()`. Generate migration SQL using `USING item_id::text`; do not drop progress/favorite rows or legacy content tables. Replace content-join review queries with one due-progress query filtered by user/time; hydrate it in the static repository.

Server actions parse inputs with Zod, call `requireUser()`, verify the ID exists in the enabled static repository, calculate review state using server time, and upsert only for the authenticated user. Never accept `userId`, status, streak, or next-review date from the client.

- [ ] **Step 4: Run DB/action regressions and typecheck**

Run: `npm test -- src/lib/db src/lib/actions src/lib/auth src/lib/study`

Run: `npm run typecheck`

Expected: PASS; SQL migration contains two UUID-to-text alterations and no table drops.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/lib/db webapp/src/lib/actions webapp/drizzle
git commit -m "feat: connect static items to user progress"
```

---

### Task 8: Build the Responsive Shell, Home, Vocabulary, and Grammar Routes

**Files:**
- Modify: `webapp/src/app/layout.tsx`
- Modify: `webapp/src/app/globals.css`
- Modify: `webapp/src/app/page.tsx`
- Modify: `webapp/src/app/page.test.tsx`
- Create: `webapp/src/components/site-header.tsx`
- Create: `webapp/src/components/site-footer.tsx`
- Create: `webapp/src/components/specimen-word.tsx`
- Create: `webapp/src/components/content-list.tsx`
- Create: tests beside each component.
- Create: `webapp/src/app/vocabulary/page.tsx`
- Create: `webapp/src/app/vocabulary/[category]/page.tsx`
- Create: `webapp/src/app/vocabulary/entry/[id]/page.tsx`
- Create: `webapp/src/app/grammar/page.tsx`
- Create: `webapp/src/app/grammar/[category]/page.tsx`
- Create: `webapp/src/app/grammar/entry/[slug]/page.tsx`
- Create: `webapp/src/app/kana/page.tsx`
- Create: tests beside each route.

**Interfaces:**
- Consumes: static repository and canonical routes.
- Produces: public learning shell, directories, details, source labels, and not-found states.

- [ ] **Step 1: Read local App Router docs and write failing UI tests**

Read local layouts/pages and Server/Client Components guides. Tests assert header links `单词 / 语法 / 搜索 / 复习 / 登录`, footer link `来源与许可`, real daily word, static category counts, stable detail links, grammar examples, the 46-pair kana table, and content-level source links.

```tsx
expect(screen.getByRole("link", { name: "单词" })).toHaveAttribute("href", "/vocabulary");
expect(screen.getByText("食べる")).toBeInTheDocument();
expect(screen.getByRole("link", { name: /Tae Kim/ })).toHaveAttribute("href", expect.stringMatching(/^https:/));
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/app/page.test.tsx src/components 'src/app/vocabulary/**/*.test.tsx' 'src/app/grammar/**/*.test.tsx' src/app/kana`

Expected: FAIL because the shell and routes are absent.

- [ ] **Step 3: Implement the specimen-room interface**

Use cool paper white, ink text, muted indigo accent, hairline dividers, serif Japanese display type, and sans-serif controls. Set `<html lang="zh-CN">`, correct metadata, visible keyboard focus, semantic lists, responsive one/two-column layouts, and no dark-mode override. Pages are synchronous or server-rendered reads from the static repository; invalid/disabled IDs call `notFound()`.

- [ ] **Step 4: Run UI tests, lint, typecheck, and build**

Run: `npm test -- src/app src/components`

Run: `npm run lint && npm run typecheck && npm run build`

Expected: PASS without `DATABASE_URL`; all public pages build from bundled JSON.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/app webapp/src/components
git commit -m "feat: build static vocabulary and grammar journeys"
```

---

### Task 9: Complete Search, Sources, Guest Rating, Favorites, and Review

**Files:**
- Create: `webapp/src/app/search/page.tsx`
- Create: `webapp/src/app/search/page.test.tsx`
- Create: `webapp/src/app/sources/page.tsx`
- Create: `webapp/src/app/sources/page.test.tsx`
- Create: `webapp/src/app/review/page.tsx`
- Create: `webapp/src/app/review/page.test.tsx`
- Create: `webapp/src/components/study-rater.tsx`
- Create: `webapp/src/components/study-rater.test.tsx`
- Modify vocabulary/grammar detail pages to render rating/favorite controls.

**Interfaces:**
- Consumes: repository search/source/hydration APIs, actions from Task 7, `idb-keyval`, auth state.
- Produces: grouped static search, attribution page, guest-local ratings, signed-in persistence, and due review UI.

- [ ] **Step 1: Write failing feature tests**

```typescript
it("does not call Neon for public search", async () => {
  render(await SearchPage({ searchParams: Promise.resolve({ q: "食べる" }) }));
  expect(getDb).not.toHaveBeenCalled();
  expect(screen.getByText("吃")).toBeInTheDocument();
});

it("stores guest rating in IndexedDB", async () => {
  render(<StudyRater itemId="vocabulary:jmdict:1000001" signedIn={false} />);
  await user.click(screen.getByRole("button", { name: "认识" }));
  expect(idbSet).toHaveBeenCalledWith(expect.stringContaining("1000001"), expect.any(Object));
});
```

Sources tests assert JMdict/Kaikki CC BY-SA links, Tae Kim CC BY-NC-SA link, hashes/dates, modification notice, and noncommercial statement. Review tests assert unauthenticated guidance and authenticated due-row hydration.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- src/app/search src/app/sources src/app/review src/components/study-rater.test.tsx`

Expected: FAIL because features are missing.

- [ ] **Step 3: Implement the full study loop**

Search reads only static repository data and groups vocabulary/grammar results. Sources renders generated source metadata. `StudyRater` stores versioned guest events under `kotonoha:guest-progress:v1:<itemId>` or calls authenticated actions; success is announced with `aria-live="polite"`. Review fetches due progress from Neon only for a signed-in user, then hydrates content via the repository and omits disabled/missing IDs without deleting progress.

- [ ] **Step 4: Run full regression suite**

Run: `npm test`

Run: `npm run lint && npm run typecheck && npm run build`

Expected: PASS; public routes/search build without database environment variables.

- [ ] **Step 5: Commit**

```bash
git add webapp/src/app/search webapp/src/app/sources webapp/src/app/review webapp/src/app/vocabulary webapp/src/app/grammar webapp/src/components/study-rater.tsx webapp/src/components/study-rater.test.tsx
git commit -m "feat: complete static content study loop"
```

---

### Task 10: Verify and Prepare Vercel Deployment

**Files:**
- Modify: `webapp/.env.example`
- Modify: `webapp/README.md`
- Modify: `webapp/package.json`
- Create: `webapp/playwright.config.ts`
- Create: `webapp/e2e/mvp.spec.ts`
- Create: `webapp/src/content/generated/verification.json`

**Interfaces:**
- Consumes: complete static bundle and app.
- Produces: reproducible content/build evidence and browser-level release gate.

- [ ] **Step 1: Write the failing browser launch path**

```typescript
test("guest completes static learning path", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "单词" }).click();
  await page.getByRole("link", { name: /常用动词/ }).click();
  await page.getByRole("link", { name: /食べる/ }).click();
  await page.getByRole("button", { name: "认识" }).click();
  await expect(page.getByText(/已记录/)).toBeVisible();
  await page.getByRole("link", { name: "来源与许可" }).click();
  await expect(page.getByText(/非商业/)).toBeVisible();
});
```

- [ ] **Step 2: Run build/e2e and capture real failures**

Run: `npm run build`

Run: `npm run test:e2e`

Expected before final fixes: any production-only route/setup failures are visible and addressed, never skipped.

- [ ] **Step 3: Document the exact deployment story**

README covers supported Node, Python venv, offline generator, content verification, tests, local dev, optional Neon migration for sign-in/progress, and Vercel deployment. `.env.example` contains only authentication/user-data variables. State explicitly that public content comes from committed JSON and public browsing works without Neon.

Generate `verification.json` from committed bytes and fail if vocabulary `< 500`, grammar `!= 30`, kana `!= 46`, invalid records are nonzero, or hashes disagree.

- [ ] **Step 4: Run the release gate**

From repository root:

```bash
.venv-content/bin/python -m pytest tests/content -q
.venv-content/bin/python scripts/content/build_static_bundle.py --verify webapp/src/content/generated
```

From `webapp/`:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all exit 0; build succeeds without `DATABASE_URL`; generated verification reports vocabulary `>= 500`, grammar `30`, kana `46`, invalid `0`; e2e passes at 360, 768, 1024, and 1440 widths.

- [ ] **Step 5: Commit**

```bash
git add webapp/.env.example webapp/README.md webapp/package.json webapp/package-lock.json webapp/playwright.config.ts webapp/e2e webapp/src/content/generated/verification.json
git commit -m "chore: prepare static MVP deployment"
```

---

## Final Release Checklist

- [ ] `git status --short` contains no upstream archives, full dictionaries, PDFs, OCR cache, secrets, database dumps, or unexpected generated files.
- [ ] `rg -n "dk-visual|Teikyo|帝京|OCR" webapp scripts data/content docs/PRD.md` returns only historical/supersession explanations.
- [ ] Generated manifest and verification hashes match committed content bytes.
- [ ] Sources page includes working JMdict, Kaikki, Tae Kim, and Creative Commons links.
- [ ] Disabled-source tests cover directories, details, search, daily word, and review hydration.
- [ ] Public browsing/search/home production build works with all Neon variables unset.
- [ ] Signed-in progress works when documented Neon variables and migration are supplied.
- [ ] If Vercel credentials are available, deploy and smoke-test the production URL; otherwise report exact external deployment steps without claiming the site is live.
