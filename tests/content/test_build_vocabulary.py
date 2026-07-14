from __future__ import annotations

import gzip
import json
from collections import Counter
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
GLOSS_DEBRIS = FIXTURES / "kaikki_gloss_debris.jsonl"
PINS = Path(__file__).resolve().parents[2] / "data/content/pins/pre-expansion-vocabulary-ids.json"


def test_pre_expansion_pin_file_is_sorted_unique_and_complete() -> None:
    pins = json.loads(PINS.read_text(encoding="utf-8"))

    assert len(pins) == 2_000
    assert pins == sorted(set(pins))
    assert all(pin.startswith("vocabulary:jmdict:") for pin in pins)


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


def test_current_quality_valid_pins_are_prioritized_and_every_other_pin_is_retired() -> None:
    pins = {
        "vocabulary:jmdict:1000001",
        "vocabulary:jmdict:1000002",
        "vocabulary:jmdict:1000003",
        "vocabulary:jmdict:1000005",
        "vocabulary:jmdict:9999999",
    }

    result = build_vocabulary(JMDICT, KAIKKI, limit=2, core_limit=1, pinned_ids=pins)

    assert {record.id for record in result.records} == {
        "vocabulary:jmdict:1000001",
        "vocabulary:jmdict:1000005",
    }
    assert result.retired_pins == {
        "vocabulary:jmdict:1000002": "ambiguous_chinese",
        "vocabulary:jmdict:1000003": "missing_chinese",
        "vocabulary:jmdict:9999999": "missing_jmdict_candidate",
    }
    assert pins == {record.id for record in result.records} | set(result.retired_pins)


def test_pin_priority_displaces_a_non_pin_without_changing_tier_capacity() -> None:
    result = build_vocabulary(
        JMDICT,
        KAIKKI,
        limit=1,
        core_limit=1,
        pinned_ids={"vocabulary:jmdict:1000004"},
    )

    assert [record.id for record in result.records] == ["vocabulary:jmdict:1000004"]
    assert result.retired_pins == {}


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


def test_raw_heading_url_and_list_debris_is_rejected_from_the_au_fixture() -> None:
    quality_rejections: Counter[str] = Counter()

    exact, spelling_only = index_kaikki_glosses(
        GLOSS_DEBRIS,
        {"合う"},
        quality_rejections=quality_rejections,
    )

    assert exact == {}
    assert next(iter(spelling_only["合う"])).glosses == ()
    assert quality_rejections["gloss_markup"] == 1


def test_each_record_requires_cjk_and_only_keeps_narrow_ascii_secondary_glosses(
    tmp_path: Path,
) -> None:
    kaikkki = tmp_path / "quality.jsonl"
    rows = [
        {
            "word": "食べる",
            "lang_code": "ja",
            "pos": "verb",
            "forms": [{"form": "たべる", "tags": ["hiragana"]}],
            "senses": [{"glosses": ["base", "COVID-19"]}],
        },
        {
            "word": "橋",
            "lang_code": "ja",
            "pos": "noun",
            "forms": [{"form": "はし", "tags": ["hiragana"]}],
            "senses": [{"glosses": ["桥", "COVID-19", "1020", "1052", "10^20"]}],
        },
    ]
    kaikkki.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows),
        encoding="utf-8",
    )

    result = build_vocabulary(JMDICT, kaikkki, limit=10, core_limit=5)

    by_id = {record.id: record for record in result.records}
    assert "vocabulary:jmdict:1000001" not in by_id
    assert by_id["vocabulary:jmdict:1000004"].meaning_zh == ["桥", "COVID-19", "10^20"]
    assert result.rejection_counts["invalid_chinese_gloss"] >= 3
