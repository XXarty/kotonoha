from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from scripts.content.build_static_bundle import build_static_bundle, verify_static_bundle
from scripts.content.fetch_sources import sha256_file


ROOT = Path(__file__).resolve().parents[2]
GRAMMAR = ROOT / "data/content/grammar/tae-kim-basic.zh.json"
KANA = ROOT / "data/content/kana/gojuon.json"


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
            },
            {
                "source_id": "tae-kim-grammar",
                "snapshot_date": "2026-07-14",
                "downloaded_at": "2026-07-14T00:00:00Z",
                "sha256": "b" * 64,
            },
            {
                "source_id": "kotonoha-kana",
                "snapshot_date": "2026-07-14",
                "downloaded_at": "2026-07-14T00:00:00Z",
                "sha256": "c" * 64,
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
    }


def test_bundle_requires_launch_minimums(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=1)

    with pytest.raises(ValueError, match="at least 500 vocabulary"):
        build_static_bundle(**inputs, output_dir=tmp_path / "generated")


def test_bundle_manifest_hashes_match_files(tmp_path: Path) -> None:
    inputs = bundle_inputs(tmp_path, vocabulary_count=500)
    output = tmp_path / "generated"

    manifest = build_static_bundle(
        **inputs,
        output_dir=output,
        built_at=datetime(2026, 7, 14, tzinfo=timezone.utc),
    )

    assert manifest.counts == {"vocabulary": 500, "grammar": 30, "kana": 46, "invalid": 0}
    for filename, digest in manifest.files.items():
        assert digest == sha256_file(output / filename)
    assert verify_static_bundle(output).counts == manifest.counts


def test_failed_validation_does_not_replace_previous_bundle(tmp_path: Path) -> None:
    output = tmp_path / "generated"
    output.mkdir()
    previous = b'{"previous":true}\n'
    (output / "manifest.json").write_bytes(previous)

    with pytest.raises(ValueError):
        build_static_bundle(**bundle_inputs(tmp_path, 1), output_dir=output)

    assert (output / "manifest.json").read_bytes() == previous
