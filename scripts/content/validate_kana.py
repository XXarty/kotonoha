from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.content.models import KanaRecord


def validate_kana_seed(path: Path) -> list[KanaRecord]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("kana seed must be a JSON array")
    entries = [KanaRecord.model_validate(item) for item in payload]
    if len(entries) != 46:
        raise ValueError(f"kana seed must contain exactly 46 entries, got {len(entries)}")
    for field in ("id", "hiragana", "katakana", "romaji"):
        if len({getattr(entry, field) for entry in entries}) != len(entries):
            raise ValueError(f"kana {field} values must be unique")
    if [entry.display_order for entry in entries] != list(range(1, 47)):
        raise ValueError("kana display_order must be sequential from 1 to 46")
    return entries


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate the 46-pair basic kana seed.")
    parser.add_argument("seed", type=Path)
    args = parser.parse_args(argv)
    entries = validate_kana_seed(args.seed)
    print(json.dumps({"kana": len(entries), "valid": True}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
