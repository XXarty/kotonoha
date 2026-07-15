import hashlib
import json
import re
import subprocess
from collections import Counter
from pathlib import Path

from scripts.content.build_static_bundle import canonical_json_bytes, verify_static_bundle
from scripts.content.fetch_sources import sha256_file
from scripts.content.validate_grammar import load_grammar_curriculum


ROOT = Path(__file__).resolve().parents[2]
GENERATED = ROOT / "webapp/src/content/generated"
PUBLIC = ROOT / "webapp/public"
PINNED_SOURCES = ROOT / "data/content/sources/pinned-2026-07-15.json"
GRAMMAR_DIR = ROOT / "data/content/grammar"
KANA_SOURCE = ROOT / "data/content/kana/gojuon.json"


def read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def test_committed_release_contract_is_complete_and_hash_consistent() -> None:
    vocabulary = read_json(GENERATED / "vocabulary.json")
    grammar = read_json(GENERATED / "grammar.json")
    kana = read_json(GENERATED / "kana.json")
    manifest = read_json(GENERATED / "manifest.json")
    verification = read_json(GENERATED / "verification.json")
    sources = read_json(GENERATED / "sources.json")
    pinned_sources = read_json(PINNED_SOURCES)
    search_index = read_json(PUBLIC / "content/search-index.json")

    assert isinstance(vocabulary, list)
    assert isinstance(grammar, list)
    assert isinstance(kana, list)
    assert isinstance(manifest, dict)
    assert isinstance(verification, dict)
    assert isinstance(sources, dict)
    assert isinstance(pinned_sources, dict)
    assert isinstance(search_index, list)

    counts = manifest["counts"]
    assert counts == {
        "vocabulary": len(vocabulary),
        "grammar": 120,
        "kana": 46,
        "invalid": 0,
    }
    assert len(vocabulary) <= 10_000
    assert Counter(record["tier"] for record in vocabulary) == {
        "core": 5_000,
        "extended": 5_000,
    }
    assert Counter(record["path"] for record in grammar) == {
        "foundation": 30,
        "core": 30,
        "expressions": 30,
        "advanced": 30,
    }
    assert Counter(record["provenance_kind"] for record in grammar) == {
        "direct-source": 114,
        "project-authored-extension": 6,
    }
    assert {
        record["license_key"]
        for record in grammar
        if record["provenance_kind"] == "direct-source"
    } == {"cc-by-nc-sa-3.0"}
    assert {
        record["license_key"]
        for record in grammar
        if record["provenance_kind"] == "project-authored-extension"
    } == {"all-rights-reserved"}

    enabled_sources = {
        source["id"] for source in sources["sources"] if source["enabled"]
    }
    enabled_ids = {
        record["id"]
        for records in (vocabulary, grammar, kana)
        for record in records
        if record["source_id"] in enabled_sources
    }
    assert {row["id"] for row in search_index} == enabled_ids
    assert len(search_index) == len(enabled_ids)

    for filename, expected_sha256 in manifest["files"].items():
        path = (
            PUBLIC / "content/search-index.json"
            if filename == "public/content/search-index.json"
            else GENERATED / filename
        )
        assert sha256_file(path) == expected_sha256
    assert verification["counts"] == counts
    assert verification["manifest_sha256"] == sha256_file(GENERATED / "manifest.json")
    assert verify_static_bundle(GENERATED, PUBLIC).counts == counts
    assert sources == {
        "sources": manifest["sources"],
        "snapshots": manifest["snapshots"],
    }
    assert sources == pinned_sources

    grammar_bytes = canonical_json_bytes(
        [
            record.model_dump(mode="json")
            for record in load_grammar_curriculum(GRAMMAR_DIR)
        ]
    )
    repository_hashes = {
        snapshot["repository_path"]: snapshot["sha256"]
        for snapshot in pinned_sources["snapshots"]
        if "repository_path" in snapshot
    }
    assert repository_hashes["data/content/grammar"] == hashlib.sha256(
        grammar_bytes
    ).hexdigest()
    assert repository_hashes["data/content/kana/gojuon.json"] == sha256_file(
        KANA_SOURCE
    )


def test_pinned_ids_are_exactly_partitioned_by_retirement_evidence() -> None:
    pins = read_json(ROOT / "data/content/pins/pre-expansion-vocabulary-ids.json")
    evidence = read_json(GENERATED / "vocabulary-retirements.json")
    vocabulary = read_json(GENERATED / "vocabulary.json")

    assert isinstance(pins, list)
    assert isinstance(evidence, dict)
    assert isinstance(vocabulary, list)
    retained = set(evidence["retained_ids"])
    retired = {record["id"] for record in evidence["retired"]}
    published = {record["id"] for record in vocabulary}

    assert evidence["pin_count"] == len(pins) == len(set(pins))
    assert retained.isdisjoint(retired)
    assert retained | retired == set(pins)
    assert retained <= published
    assert retired.isdisjoint(published)


def test_every_published_vocabulary_record_has_clean_cjk_glosses() -> None:
    vocabulary = read_json(GENERATED / "vocabulary.json")
    assert isinstance(vocabulary, list)
    debris = re.compile(
        r"(?:={2,}|https?://|www\.|(?:^|\s)#+(?::|\s)|\{\{|\}\}|\[\[|\]\])",
        re.IGNORECASE,
    )
    cjk = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")

    assert all(record["meaning_zh"] for record in vocabulary)
    assert all(any(cjk.search(gloss) for gloss in record["meaning_zh"]) for record in vocabulary)
    assert not [
        (record["id"], gloss)
        for record in vocabulary
        for gloss in record["meaning_zh"]
        if debris.search(gloss)
    ]


def test_morau_example_uses_direct_natural_chinese() -> None:
    curriculum = load_grammar_curriculum(GRAMMAR_DIR)
    morau = next(entry for entry in curriculum if entry.slug == "morau")

    assert morau.examples[0].ja == "先生に作文を直してもらいました。"
    assert morau.examples[0].zh == "老师帮我修改了作文。"


def test_local_only_content_inputs_are_not_tracked() -> None:
    tracked = subprocess.run(
        ["git", "ls-files", "data/content/upstream", "data/content/build"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()

    assert tracked == []


def test_retired_content_modules_do_not_exist() -> None:
    retired = {
        "extract_dk.py",
        "extract_grammar.py",
        "translate_zh.py",
        "import_to_neon.py",
        "import_tatoeba.py",
        "build_tatoeba.py",
    }
    present = {path.name for path in (ROOT / "scripts/content").glob("*.py")}

    assert retired.isdisjoint(present)


def test_content_scripts_do_not_import_pdf_or_ocr_packages() -> None:
    forbidden = ("pypdf", "pdfplumber", "pytesseract", "pdf2image")
    imports = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (ROOT / "scripts/content").glob("*.py")
    ).lower()

    assert not [package for package in forbidden if package in imports]


def test_published_source_catalog_covers_every_grammar_source() -> None:
    curriculum = load_grammar_curriculum(ROOT / "data/content/grammar")
    payload = json.loads(
        (ROOT / "webapp/src/content/generated/sources.json").read_text(
            encoding="utf-8"
        )
    )
    sources = {source["id"]: source for source in payload["sources"]}

    assert {entry.source_id for entry in curriculum} <= sources.keys()
    assert sources["tae-kim-grammar"] == {
        "enabled": True,
        "id": "tae-kim-grammar",
        "license_name": "CC BY-NC-SA 3.0",
        "license_url": "https://creativecommons.org/licenses/by-nc-sa/3.0/us/",
        "title": "Tae Kim Japanese Grammar Guide",
        "url": "https://guidetojapanese.org/learn/grammar",
    }
    assert sources["kotonoha-original"] == {
        "enabled": True,
        "id": "kotonoha-original",
        "license_name": "All rights reserved",
        "license_url": "https://github.com/XXarty/kotonoha",
        "title": "KOTONOHA 原创语法扩展",
        "url": "https://github.com/XXarty/kotonoha",
    }
