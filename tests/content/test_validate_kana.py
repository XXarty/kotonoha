from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.content.validate_kana import validate_kana_seed


ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "data/content/kana/gojuon.json"


def test_gojuon_has_forty_six_unique_basic_pairs() -> None:
    entries = validate_kana_seed(SEED)

    assert len(entries) == 46
    assert len({entry.hiragana for entry in entries}) == 46
    assert len({entry.katakana for entry in entries}) == 46
    assert len({entry.romaji for entry in entries}) == 46
    assert [entry.display_order for entry in entries] == list(range(1, 47))


def test_validator_rejects_duplicate_hiragana(tmp_path: Path) -> None:
    payload = json.loads(SEED.read_text(encoding="utf-8"))
    payload[1]["hiragana"] = payload[0]["hiragana"]
    duplicate_seed = tmp_path / "duplicate.json"
    duplicate_seed.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    with pytest.raises(ValueError, match="unique"):
        validate_kana_seed(duplicate_seed)
