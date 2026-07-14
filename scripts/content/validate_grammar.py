from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.content.models import GrammarRecord


def validate_grammar_seed(path: Path) -> list[GrammarRecord]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("grammar seed must be a JSON array")
    entries = [GrammarRecord.model_validate(item) for item in payload]
    if len(entries) != 30:
        raise ValueError(f"grammar seed must contain exactly 30 entries, got {len(entries)}")
    if len({entry.slug for entry in entries}) != len(entries):
        raise ValueError("grammar slugs must be unique")
    if len({entry.id for entry in entries}) != len(entries):
        raise ValueError("grammar IDs must be unique")
    if [entry.display_order for entry in entries] != list(range(1, 31)):
        raise ValueError("grammar display_order must be sequential from 1 to 30")
    return entries


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate the 30-unit grammar seed.")
    parser.add_argument("seed", type=Path)
    args = parser.parse_args(argv)
    entries = validate_grammar_seed(args.seed)
    print(json.dumps({"grammar": len(entries), "valid": True}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
