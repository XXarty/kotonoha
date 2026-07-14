from __future__ import annotations

from pathlib import Path

from scripts.content.build_search_index import (
    build_search_index,
    main,
    write_verified_bundle_search_index,
)
from scripts.content.models import GrammarRecord, KanaRecord, VocabularyRecord


ROOT = Path(__file__).resolve().parents[2]


def vocabulary(*, entry_id: str, japanese: str) -> VocabularyRecord:
    upstream_id = entry_id.rsplit(":", 1)[-1]
    return VocabularyRecord.model_validate(
        {
            "id": entry_id,
            "source_id": "jmdict-kaikki",
            "source_key": f"jmdict:{upstream_id}",
            "category": "verbs",
            "list_name": "common-verbs",
            "japanese": japanese,
            "kana": "たべる",
            "romaji": "taberu",
            "part_of_speech": ["v1"],
            "meaning_zh": ["吃", "用餐"],
            "meaning_en": ["to eat"],
            "meaning_zh_source": "kaikki-zhwiktionary",
            "tier": "core",
            "priority_tags": ["news1"],
            "examples": [{"ja": "ご飯を食べる。", "zh": "吃饭。", "source": "kotonoha-original"}],
            "content_version": "2026-07-15",
            "published": True,
        }
    )


def grammar() -> GrammarRecord:
    return GrammarRecord.model_validate(
        {
            "id": "grammar:tae-kim:topic-marker",
            "source_id": "tae-kim-grammar",
            "source_key": "tae-kim:topic-marker",
            "slug": "topic-marker",
            "category": "particles",
            "list_name": "particles",
            "expression": "は（主题）",
            "connection": "名词 + は",
            "explanation_zh": "提示句子的主题。",
            "path": "foundation",
            "examples": [{"ja": "私は学生です。", "zh": "我是学生。", "source": "tae-kim"}],
            "common_mistakes": ["不要把主题标记等同于主语标记。"],
            "related_entries": [],
            "source_url": "https://guidetojapanese.org/learn/grammar/particlesintro",
            "license_key": "cc-by-nc-sa-3.0",
            "content_version": "2026-07-15",
            "display_order": 1,
            "published": True,
        }
    )


def kana() -> KanaRecord:
    return KanaRecord.model_validate(
        {
            "id": "kana:gojuon:a",
            "source_id": "kotonoha-kana",
            "hiragana": "あ",
            "katakana": "ア",
            "romaji": "a",
            "row_group": "元音",
            "display_order": 1,
            "published": True,
        }
    )


def test_search_index_is_compact_deterministic_and_route_safe() -> None:
    records = [
        vocabulary(entry_id="vocabulary:jmdict:1000002", japanese="食事する"),
        vocabulary(entry_id="vocabulary:jmdict:1000001", japanese="食べる"),
    ]

    first = build_search_index(list(reversed(records)), [grammar()], [kana()])
    second = build_search_index(records, [grammar()], [kana()])

    assert first == second
    assert [row["kind"] for row in first] == ["grammar", "kana", "vocabulary", "vocabulary"]
    assert all(
        set(row) == {"id", "kind", "primary", "reading", "romaji", "meaning", "href"}
        for row in first
    )
    vocabulary_row = next(row for row in first if row["id"] == "vocabulary:jmdict:1000001")
    assert vocabulary_row == {
        "id": "vocabulary:jmdict:1000001",
        "kind": "vocabulary",
        "primary": "食べる",
        "reading": "たべる",
        "romaji": "taberu",
        "meaning": "吃",
        "href": "/vocabulary/entry/vocabulary%3Ajmdict%3A1000001",
    }


def test_search_index_maps_grammar_and_kana_without_full_examples() -> None:
    rows = build_search_index([], [grammar()], [kana()])

    assert rows == [
        {
            "id": "grammar:tae-kim:topic-marker",
            "kind": "grammar",
            "primary": "は(主题)",
            "reading": "",
            "romaji": "",
            "meaning": "提示句子的主题。",
            "href": "/grammar/entry/topic-marker",
        },
        {
            "id": "kana:gojuon:a",
            "kind": "kana",
            "primary": "あ · ア",
            "reading": "",
            "romaji": "a",
            "meaning": "元音",
            "href": "/kana",
        },
    ]


def test_verified_committed_bundle_can_publish_without_inventing_tiers(tmp_path: Path) -> None:
    output = tmp_path / "search-index.json"

    rows = write_verified_bundle_search_index(
        bundle_dir=ROOT / "webapp/src/content/generated",
        output_path=output,
    )

    assert len(rows) == 2000 + 30 + 46
    assert output.read_bytes().endswith(b"\n")
    assert all("tier" not in row for row in rows)


def test_cli_publishes_a_verified_bundle_without_upstream_inputs(tmp_path: Path) -> None:
    output = tmp_path / "search-index.json"

    assert main(
        [
            "--bundle",
            str(ROOT / "webapp/src/content/generated"),
            "--output",
            str(output),
        ]
    ) == 0

    assert output.is_file()
