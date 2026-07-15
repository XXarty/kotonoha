from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

import scripts.content.build_static_bundle as static_bundle
from scripts.content.build_static_bundle import (
    ATTRIBUTION,
    build_static_bundle,
    canonical_json_bytes,
    verify_static_bundle,
)
from scripts.content.fetch_sources import sha256_file
from scripts.content.validate_grammar import load_grammar_curriculum


ROOT = Path(__file__).resolve().parents[2]
GRAMMAR = ROOT / "data/content/grammar"
KANA = ROOT / "data/content/kana/gojuon.json"
PINNED_SOURCES = ROOT / "data/content/sources/pinned-2026-07-15.json"
GENERATED = ROOT / "webapp/src/content/generated"
PUBLIC = ROOT / "webapp/public"


def write_json(path: Path, payload: object) -> Path:
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return path


def vocabulary(count: int) -> list[dict[str, object]]:
    return [
        {
            "id": f"vocabulary:jmdict:{1_000_000 + index}",
            "source_id": "jmdict-kaikki",
            "source_key": f"jmdict:{1_000_000 + index}",
            "category": "verbs",
            "list_name": "common-verbs",
            "japanese": f"食べる{index}",
            "kana": f"たべる{index}",
            "romaji": f"taberu{index}",
            "part_of_speech": ["v1"],
            "meaning_zh": ["吃"],
            "meaning_en": ["to eat"],
            "meaning_zh_source": "kaikki-zhwiktionary",
            "tier": "core",
            "priority_tags": [],
            "examples": [],
            "content_version": "2026-07-13",
            "published": True,
        }
        for index in range(count)
    ]


def source_metadata() -> dict[str, object]:
    return {
        "sources": [
            {
                "id": "jmdict-kaikki",
                "title": "JMdict + Kaikki 中文维基词典",
                "url": "https://kaikki.org/zhwiktionary/rawdata.html",
                "license_name": "CC BY-SA 4.0",
                "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
                "enabled": True,
            },
            {
                "id": "tae-kim-grammar",
                "title": "Tae Kim Japanese Grammar Guide",
                "url": "https://guidetojapanese.org/learn/grammar",
                "license_name": "CC BY-NC-SA 3.0",
                "license_url": "https://creativecommons.org/licenses/by-nc-sa/3.0/us/",
                "enabled": True,
            },
            {
                "id": "kotonoha-original",
                "title": "KOTONOHA 原创语法扩展",
                "url": "https://github.com/XXarty/kotonoha",
                "license_name": "All rights reserved",
                "license_url": "https://github.com/XXarty/kotonoha",
                "enabled": True,
            },
            {
                "id": "kotonoha-kana",
                "title": "KOTONOHA 基础五十音",
                "url": "https://github.com/example/kotonoha",
                "license_name": "CC0 1.0",
                "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
                "enabled": True,
            },
        ],
        "snapshots": [
            {
                "source_id": "jmdict-kaikki",
                "snapshot_date": "2026-07-13",
                "downloaded_at": "2026-07-14T00:00:00Z",
                "sha256": "a" * 64,
                "artifact_name": "jmdict-eng.json.tgz",
                "asset_url": "https://github.com/scriptin/jmdict-simplified/releases/download/v1/jmdict-eng.json.tgz",
            },
            {
                "source_id": "tae-kim-grammar",
                "snapshot_date": "2026-07-14",
                "downloaded_at": "2026-07-14T00:00:00Z",
                "sha256": "b" * 64,
                "repository_path": "data/content/grammar",
            },
            {
                "source_id": "kotonoha-original",
                "snapshot_date": "2026-07-14",
                "downloaded_at": "2026-07-14T00:00:00Z",
                "sha256": "d" * 64,
                "repository_path": "data/content/grammar",
            },
            {
                "source_id": "kotonoha-kana",
                "snapshot_date": "2026-07-14",
                "downloaded_at": "2026-07-14T00:00:00Z",
                "sha256": "c" * 64,
                "repository_path": "data/content/kana/gojuon.json",
            },
        ],
    }


def bundle_inputs(tmp_path: Path, vocabulary_count: int) -> dict[str, Path]:
    return {
        "vocabulary_path": write_json(tmp_path / "vocabulary.json", vocabulary(vocabulary_count)),
        "grammar_path": GRAMMAR,
        "kana_path": KANA,
        "source_metadata_path": write_json(tmp_path / "sources.json", source_metadata()),
        "rejections_path": write_json(tmp_path / "rejections.json", {"missing_chinese": 7}),
        "retirements_path": write_json(
            tmp_path / "vocabulary-retirements.json",
            {
                "baseline_commit": "d5b5ccb",
                "pin_count": 0,
                "retained_ids": [],
                "retired": [],
            },
        ),
    }


def disable_source_metadata(tmp_path: Path, source_id: str) -> Path:
    metadata = source_metadata()
    for source in metadata["sources"]:
        if source["id"] == source_id:
            source["enabled"] = False
    return write_json(tmp_path / f"sources-without-{source_id}.json", metadata)


def rewrite_search_evidence(output: Path, public: Path, rows: list[dict[str, object]]) -> None:
    write_json(public / "content/search-index.json", rows)
    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    manifest["files"]["public/content/search-index.json"] = sha256_file(
        public / "content/search-index.json"
    )
    (output / "manifest.json").write_bytes(canonical_json_bytes(manifest))
    verification = json.loads((output / "verification.json").read_text(encoding="utf-8"))
    verification["manifest_sha256"] = sha256_file(output / "manifest.json")
    (output / "verification.json").write_bytes(canonical_json_bytes(verification))


def test_bundle_requires_launch_minimums(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=1)

    with pytest.raises(ValueError, match="at least 500 vocabulary"):
        build_static_bundle(
            **inputs,
            output_dir=tmp_path / "generated",
            public_dir=tmp_path / "public",
        )


def test_vocabulary_attribution_separates_jmdict_and_kaikki_licenses() -> None:
    assert "JMdict — EDRDG redistribution terms" in ATTRIBUTION
    assert "https://www.edrdg.org/edrdg/licence.html" in ATTRIBUTION
    assert "Kaikki/Wiktionary Chinese glosses — CC BY-SA 4.0" in ATTRIBUTION
    assert "https://creativecommons.org/licenses/by-sa/4.0/" in ATTRIBUTION


def test_bundle_requires_snapshot_for_every_enabled_published_source(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    metadata = source_metadata()
    metadata["snapshots"] = [
        snapshot
        for snapshot in metadata["snapshots"]
        if snapshot["source_id"] != "kotonoha-original"
    ]
    inputs["source_metadata_path"] = write_json(tmp_path / "missing-snapshot.json", metadata)

    with pytest.raises(ValueError, match="kotonoha-original"):
        build_static_bundle(
            **inputs,
            output_dir=tmp_path / "generated",
            public_dir=tmp_path / "public",
        )


def test_bundle_manifest_hashes_match_files(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    output = tmp_path / "generated"

    manifest = build_static_bundle(
        **inputs,
        output_dir=output,
        public_dir=tmp_path / "public",
        built_at=datetime(2026, 7, 14, tzinfo=timezone.utc),
    )

    assert manifest.counts == {"vocabulary": 500, "grammar": 120, "kana": 46, "invalid": 0}
    for filename, digest in manifest.files.items():
        file_path = (
            tmp_path / "public/content/search-index.json"
            if filename == "public/content/search-index.json"
            else output / filename
        )
        assert digest == sha256_file(file_path)
    verification = json.loads((output / "verification.json").read_text(encoding="utf-8"))
    assert verification["manifest_sha256"] == sha256_file(output / "manifest.json")
    assert verification["counts"] == manifest.counts
    assert verify_static_bundle(output, tmp_path / "public").counts == manifest.counts
    assert "vocabulary-retirements.json" in manifest.files


@pytest.mark.parametrize(
    ("disabled_source", "removed_kind"),
    [
        ("jmdict-kaikki", "vocabulary"),
        ("tae-kim-grammar", "grammar"),
        ("kotonoha-original", "grammar"),
        ("kotonoha-kana", "kana"),
    ],
)
def test_bundle_search_index_excludes_each_disabled_source_but_retains_enabled_content(
    tmp_path: Path,
    disabled_source: str,
    removed_kind: str,
) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    inputs["source_metadata_path"] = disable_source_metadata(tmp_path, disabled_source)
    output = tmp_path / "generated"
    public = tmp_path / "public"

    build_static_bundle(**inputs, output_dir=output, public_dir=public)

    index_rows = json.loads(
        (public / "content/search-index.json").read_text(encoding="utf-8")
    )
    index_ids = {row["id"] for row in index_rows}
    generated = [
        *json.loads((output / "vocabulary.json").read_text(encoding="utf-8")),
        *json.loads((output / "grammar.json").read_text(encoding="utf-8")),
        *json.loads((output / "kana.json").read_text(encoding="utf-8")),
    ]
    removed_ids = {
        item["id"] for item in generated if item["source_id"] == disabled_source
    }
    retained_ids = {
        item["id"] for item in generated if item["source_id"] != disabled_source
    }

    assert removed_ids
    assert {item["kind"] for item in generated if item["id"] in removed_ids} == {
        removed_kind
    }
    assert index_ids.isdisjoint(removed_ids)
    assert index_ids == retained_ids

    rewrite_search_evidence(
        output,
        public,
        [*index_rows, {**index_rows[0], "id": sorted(removed_ids)[0]}],
    )
    with pytest.raises(ValueError, match="public search index IDs"):
        verify_static_bundle(output, public)


def test_verifier_rejects_search_index_with_unknown_or_missing_enabled_ids(
    tmp_path: Path,
) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    output = tmp_path / "generated"
    public = tmp_path / "public"
    build_static_bundle(**inputs, output_dir=output, public_dir=public)
    original = json.loads(
        (public / "content/search-index.json").read_text(encoding="utf-8")
    )

    rewrite_search_evidence(
        output,
        public,
        [*original, {**original[0], "id": "grammar:tae-kim:not-generated"}],
    )
    with pytest.raises(ValueError, match="public search index IDs"):
        verify_static_bundle(output, public)

    rewrite_search_evidence(output, public, original[1:])
    with pytest.raises(ValueError, match="public search index IDs"):
        verify_static_bundle(output, public)


def test_verifier_rejects_duplicate_search_index_ids(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    output = tmp_path / "generated"
    public = tmp_path / "public"
    build_static_bundle(**inputs, output_dir=output, public_dir=public)
    original = json.loads(
        (public / "content/search-index.json").read_text(encoding="utf-8")
    )
    rewrite_search_evidence(output, public, [*original, original[0]])

    with pytest.raises(ValueError, match="duplicate public search index IDs"):
        verify_static_bundle(output, public)


def test_bundle_rejects_retirement_evidence_with_unresolved_or_missing_pins(
    tmp_path: Path,
) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    inputs["retirements_path"] = write_json(
        tmp_path / "bad-retirements.json",
        {
            "baseline_commit": "d5b5ccb",
            "pin_count": 2,
            "retained_ids": ["vocabulary:jmdict:1000000"],
            "retired": [],
        },
    )

    with pytest.raises(ValueError, match="partition every pin"):
        build_static_bundle(
            **inputs,
            output_dir=tmp_path / "generated",
            public_dir=tmp_path / "public",
        )


def test_bundle_rejects_an_incomplete_grammar_curriculum(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    inputs["grammar_path"] = ROOT / "data/content/grammar/tae-kim-foundation.zh.json"

    with pytest.raises(ValueError, match="exactly 120 grammar"):
        build_static_bundle(
            **inputs,
            output_dir=tmp_path / "generated",
            public_dir=tmp_path / "public",
        )


def test_bundle_verifies_public_search_index_hash(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    output = tmp_path / "generated"
    public = tmp_path / "public"

    manifest = build_static_bundle(**inputs, output_dir=output, public_dir=public)

    search_index = public / "content/search-index.json"
    assert manifest.files["public/content/search-index.json"] == sha256_file(search_index)
    assert verify_static_bundle(output, public) == manifest

    search_index.write_bytes(b"[]\n")
    with pytest.raises(ValueError, match="bundle hash mismatch for public/content/search-index.json"):
        verify_static_bundle(output, public)


def test_verifier_rejects_stale_release_evidence(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    output = tmp_path / "generated"
    build_static_bundle(**inputs, output_dir=output, public_dir=tmp_path / "public")
    verification = json.loads((output / "verification.json").read_text(encoding="utf-8"))
    verification["manifest_sha256"] = "0" * 64
    write_json(output / "verification.json", verification)

    with pytest.raises(ValueError, match="verification manifest hash mismatch"):
        verify_static_bundle(output, tmp_path / "public")


def test_failed_validation_does_not_replace_previous_bundle(tmp_path: Path) -> None:
    output = tmp_path / "generated"
    output.mkdir()
    previous = b'{"previous":true}\n'
    (output / "manifest.json").write_bytes(previous)

    with pytest.raises(ValueError):
        build_static_bundle(
            **bundle_inputs(tmp_path, 1),
            output_dir=output,
            public_dir=tmp_path / "public",
        )

    assert (output / "manifest.json").read_bytes() == previous


def test_failed_staged_verification_preserves_bundle_and_public_index(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    output = tmp_path / "generated"
    output.mkdir()
    previous_manifest = b'{"previous":true}\n'
    (output / "manifest.json").write_bytes(previous_manifest)
    public = tmp_path / "public"
    (public / "content").mkdir(parents=True)
    previous_index = b'[{"previous":true}]\n'
    (public / "content/search-index.json").write_bytes(previous_index)

    def reject_staged_bundle(_output_dir: Path, _public_dir: Path) -> None:
        raise ValueError("injected staged verification failure")

    monkeypatch.setattr(static_bundle, "verify_static_bundle", reject_staged_bundle)

    with pytest.raises(ValueError, match="injected staged verification failure"):
        build_static_bundle(
            **bundle_inputs(tmp_path, 500),
            output_dir=output,
            public_dir=public,
        )

    assert (output / "manifest.json").read_bytes() == previous_manifest
    assert (public / "content/search-index.json").read_bytes() == previous_index


def test_public_search_index_is_the_last_replaced_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    replaced_destinations: list[Path] = []
    original_replace = Path.replace

    def track_replace(source: Path, destination: Path) -> Path:
        replaced_destinations.append(Path(destination))
        return original_replace(source, destination)

    monkeypatch.setattr(Path, "replace", track_replace)
    public = tmp_path / "public"

    build_static_bundle(
        **bundle_inputs(tmp_path, 500),
        output_dir=tmp_path / "generated",
        public_dir=public,
    )

    assert replaced_destinations[-1] == public / "content/search-index.json"


def test_committed_pinned_metadata_rebuilds_the_committed_release_evidence(
    tmp_path: Path,
) -> None:
    committed_manifest = json.loads((GENERATED / "manifest.json").read_text(encoding="utf-8"))
    rejections = write_json(
        tmp_path / "rejections.json",
        committed_manifest["rejection_counts"],
    )
    output = tmp_path / "generated"
    public = tmp_path / "public"

    build_static_bundle(
        vocabulary_path=GENERATED / "vocabulary.json",
        grammar_path=GRAMMAR,
        kana_path=KANA,
        source_metadata_path=PINNED_SOURCES,
        rejections_path=rejections,
        retirements_path=GENERATED / "vocabulary-retirements.json",
        output_dir=output,
        public_dir=public,
        built_at=datetime.fromisoformat(committed_manifest["built_at"].replace("Z", "+00:00")),
    )

    assert (output / "sources.json").read_bytes() == (GENERATED / "sources.json").read_bytes()
    assert (output / "manifest.json").read_bytes() == (GENERATED / "manifest.json").read_bytes()
    assert (public / "content/search-index.json").read_bytes() == (
        PUBLIC / "content/search-index.json"
    ).read_bytes()


def test_pinned_metadata_links_exact_assets_and_hashes_local_sources() -> None:
    metadata = json.loads(PINNED_SOURCES.read_text(encoding="utf-8"))
    snapshots = metadata["snapshots"]
    vocabulary_source = next(
        source for source in metadata["sources"] if source["id"] == "jmdict-kaikki"
    )

    assert snapshots[0]["asset_url"].endswith(
        "/3.6.2%2B20260713141310/jmdict-eng-3.6.2%2B20260713141310.json.tgz"
    )
    assert snapshots[1]["asset_url"] == (
        "https://kaikki.org/zhwiktionary/raw-wiktextract-data.jsonl.gz"
    )
    grammar_bytes = canonical_json_bytes(
        [
            record.model_dump(mode="json")
            for record in load_grammar_curriculum(GRAMMAR)
        ]
    )
    assert snapshots[2]["sha256"] == hashlib.sha256(grammar_bytes).hexdigest()
    assert snapshots[3]["sha256"] == hashlib.sha256(grammar_bytes).hexdigest()
    assert snapshots[4]["sha256"] == sha256_file(KANA)
    assert vocabulary_source["license_components"] == [
        {
            "label": "JMdict — EDRDG redistribution terms",
            "url": "https://www.edrdg.org/edrdg/licence.html",
        },
        {
            "label": "Kaikki/Wiktionary Chinese glosses — CC BY-SA 4.0",
            "url": "https://creativecommons.org/licenses/by-sa/4.0/",
        },
    ]
