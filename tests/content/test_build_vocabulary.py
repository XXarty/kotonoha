from __future__ import annotations

import json
import gzip
from pathlib import Path

from scripts.content.build_vocabulary import (
    build_vocabulary,
    index_kaikki_glosses,
    limit_balanced_records,
    select_jmdict_candidates,
)
from scripts.content.models import VocabularyRecord


FIXTURES = Path(__file__).parent / "fixtures"
JMDICT = FIXTURES / "jmdict_common.json"
KAIKKI = FIXTURES / "kaikki_zh.jsonl"


def test_selects_common_spelling_compatible_reading_and_english_gloss() -> None:
    candidates = select_jmdict_candidates(json.loads(JMDICT.read_text(encoding="utf-8")))

    assert candidates[0].entry_id == "1000001"
    assert candidates[0].japanese == "食べる"
    assert candidates[0].kana == "たべる"
    assert candidates[0].part_of_speech == ("v1",)
    assert candidates[0].meaning_en == ("to eat",)
    assert candidates[0].common is True
    assert candidates[0].priority_tags == ("common",)

    assert candidates[-1].japanese == "静か"
    assert candidates[-1].common is False
    assert candidates[-1].priority_tags == ()


def test_match_publishes_unique_gloss_and_rejects_ambiguous_or_missing() -> None:
    result = build_vocabulary(JMDICT, KAIKKI, limit=500, core_limit=500)

    by_id = {record.id: record for record in result.records}
    assert set(by_id) == {
        "vocabulary:jmdict:1000001",
        "vocabulary:jmdict:1000004",
        "vocabulary:jmdict:1000005",
    }
    assert by_id["vocabulary:jmdict:1000001"].meaning_zh == ["吃", "进食"]
    assert result.rejection_counts == {
        "ambiguous_chinese": 1,
        "missing_chinese": 1,
    }


def test_build_is_byte_deterministic() -> None:
    first = build_vocabulary(JMDICT, KAIKKI)
    second = build_vocabulary(JMDICT, KAIKKI)

    assert first.json_bytes() == second.json_bytes()


def test_build_streams_compressed_kaikki_jsonl(tmp_path: Path) -> None:
    compressed = tmp_path / "kaikki.jsonl.gz"
    with gzip.open(compressed, "wt", encoding="utf-8") as handle:
        handle.write(KAIKKI.read_text(encoding="utf-8"))

    result = build_vocabulary(JMDICT, compressed)

    assert {record.id for record in result.records} == {
        "vocabulary:jmdict:1000001",
        "vocabulary:jmdict:1000004",
        "vocabulary:jmdict:1000005",
    }


def test_exact_spelling_and_reading_disambiguate_kaikki_homographs(tmp_path: Path) -> None:
    bridge_rows = "".join(
        line
        for line in KAIKKI.read_text(encoding="utf-8").splitlines(keepends=True)
        if json.loads(line)["word"] == "橋"
    )
    kaikki = tmp_path / "reading-aware-kaikki.jsonl"
    kaikki.write_text(bridge_rows, encoding="utf-8")

    result = build_vocabulary(JMDICT, kaikki)

    assert result.records[0].meaning_zh == ["桥"]
    assert result.rejection_counts.get("ambiguous_chinese", 0) == 0


def test_common_candidates_are_core_and_extended_candidates_fill_remaining_slots() -> None:
    result = build_vocabulary(JMDICT, KAIKKI, limit=3, core_limit=2)

    assert [item.tier for item in result.records] == ["core", "core", "extended"]
    assert [item.priority_tags for item in result.records] == [
        ["common"],
        ["common"],
        [],
    ]
    assert result.records[-1].japanese == "静か"


def test_missing_reading_requires_unique_gloss_after_compatible_pos(tmp_path: Path) -> None:
    kaikki = tmp_path / "kaikki-without-readings.jsonl"
    rows = [
        {"word": "橋", "lang_code": "ja", "pos": "noun", "senses": [{"glosses": ["桥"]}]},
        {"word": "橋", "lang_code": "ja", "pos": "verb", "senses": [{"glosses": ["架桥"]}]},
        {"word": "会う", "lang_code": "ja", "pos": "verb", "senses": [{"glosses": ["见面"]}]},
        {"word": "会う", "lang_code": "ja", "pos": "verb", "senses": [{"glosses": ["偶遇"]}]},
    ]
    kaikki.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )

    result = build_vocabulary(JMDICT, kaikki, limit=10, core_limit=5)

    bridge = next(record for record in result.records if record.japanese == "橋")
    assert bridge.meaning_zh == ["桥"]
    assert result.rejection_counts["ambiguous_chinese"] == 1
    assert result.rejection_counts["missing_chinese"] == 3


def test_reading_and_pos_failures_have_separate_rejection_counters(tmp_path: Path) -> None:
    kaikki = tmp_path / "kaikki-mismatches.jsonl"
    rows = [
        {
            "word": "食べる",
            "lang_code": "ja",
            "pos": "verb",
            "forms": [{"form": "くう", "tags": ["hiragana"]}],
            "senses": [{"glosses": ["吃"]}],
        },
        {
            "word": "橋",
            "lang_code": "ja",
            "pos": "verb",
            "forms": [{"form": "はし", "tags": ["reading"]}],
            "senses": [{"glosses": ["架桥"]}],
        },
    ]
    kaikki.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )

    result = build_vocabulary(JMDICT, kaikki)

    assert result.rejection_counts == {
        "missing_chinese": 3,
        "pos_mismatch": 1,
        "reading_mismatch": 1,
    }


def test_launch_limit_keeps_multiple_available_categories() -> None:
    def record(identifier: int, category: str) -> VocabularyRecord:
        return VocabularyRecord(
            id=f"vocabulary:jmdict:{identifier}",
            source_id="jmdict-kaikki",
            source_key=f"jmdict:{identifier}",
            category=category,
            list_name=f"common-{category}",
            japanese=f"語{identifier}",
            kana=f"ご{identifier}",
            romaji=f"go{identifier}",
            part_of_speech=[category],
            meaning_zh=["词"],
            meaning_en=["word"],
            meaning_zh_source="kaikki-zhwiktionary",
            tier="core",
            priority_tags=["common"],
            content_version="2026-07-13",
            published=True,
        )

    records = [
        record(1000001, "nouns"),
        record(1000002, "nouns"),
        record(1000003, "nouns"),
        record(1000004, "verbs"),
    ]

    selected = limit_balanced_records(records, limit=2)

    assert {item.category for item in selected} == {"nouns", "verbs"}


def test_kaikki_section_markers_do_not_duplicate_a_gloss(tmp_path: Path) -> None:
    kaikki = tmp_path / "kaikki.jsonl"
    kaikki.write_text(
        json.dumps(
            {
                "lang_code": "ja",
                "word": "開館",
                "senses": [{"glosses": ["开馆。==日语== 開館【かいかん】开馆。"]}],
            },
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    exact, spelling_only = index_kaikki_glosses(kaikki, {"開館"})

    assert exact == {}
    candidate = next(iter(spelling_only["開館"]))
    assert (
        candidate.word,
        candidate.readings,
        candidate.part_of_speech,
        candidate.glosses,
    ) == ("開館", (), (), ("开馆。",))
