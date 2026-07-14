from __future__ import annotations

import json
import gzip
from pathlib import Path

from scripts.content.build_vocabulary import build_vocabulary, select_jmdict_candidates


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
