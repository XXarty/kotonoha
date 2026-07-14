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


def test_match_publishes_unique_gloss_and_rejects_ambiguous_or_missing() -> None:
    result = build_vocabulary(JMDICT, KAIKKI, limit=500)

    assert [record.id for record in result.records] == ["vocabulary:jmdict:1000001"]
    assert result.records[0].meaning_zh == ["吃", "进食"]
    assert result.rejection_counts == {
        "ambiguous_chinese": 1,
        "missing_chinese": 1,
    }


def test_build_is_byte_deterministic() -> None:
    first = build_vocabulary(JMDICT, KAIKKI, limit=500)
    second = build_vocabulary(JMDICT, KAIKKI, limit=500)

    assert first.json_bytes() == second.json_bytes()


def test_build_streams_compressed_kaikki_jsonl(tmp_path: Path) -> None:
    compressed = tmp_path / "kaikki.jsonl.gz"
    with gzip.open(compressed, "wt", encoding="utf-8") as handle:
        handle.write(KAIKKI.read_text(encoding="utf-8"))

    result = build_vocabulary(JMDICT, compressed, limit=500)

    assert [record.id for record in result.records] == ["vocabulary:jmdict:1000001"]


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

    assert index_kaikki_glosses(kaikki, {"開館"}) == {"開館": {("开馆。",)}}
