from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.content.validate_grammar import validate_grammar_seed


ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "data/content/grammar/tae-kim-basic.zh.json"


def test_launch_seed_has_thirty_complete_unique_entries() -> None:
    entries = validate_grammar_seed(SEED)

    assert len(entries) == 30
    assert len({entry.slug for entry in entries}) == 30
    assert [entry.display_order for entry in entries] == list(range(1, 31))
    assert all(entry.source_url.startswith("https://guidetojapanese.org/") for entry in entries)
    assert all(entry.example_ja and entry.example_zh for entry in entries)


def test_validator_rejects_duplicate_slug(tmp_path: Path) -> None:
    payload = json.loads(SEED.read_text(encoding="utf-8"))
    payload[1]["slug"] = payload[0]["slug"]
    payload[1]["id"] = payload[0]["id"]
    payload[1]["source_key"] = payload[0]["source_key"]
    duplicate_seed = tmp_path / "duplicate.json"
    duplicate_seed.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    with pytest.raises(ValueError, match="unique"):
        validate_grammar_seed(duplicate_seed)
