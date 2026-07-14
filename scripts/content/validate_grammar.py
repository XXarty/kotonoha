from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.content.models import GrammarRecord


PATH_FILE_PATTERN = re.compile(
    r"^tae-kim-(foundation|core|expressions|advanced)\.zh\.json$"
)


def _load_grammar_file(path: Path) -> list[GrammarRecord]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"grammar file must be a JSON array: {path}")
    return [GrammarRecord.model_validate(item) for item in payload]


def load_grammar_curriculum(path: Path) -> list[GrammarRecord]:
    is_directory = path.is_dir()
    files = sorted(path.glob("tae-kim-*.zh.json")) if is_directory else [path]
    if not files:
        raise ValueError(f"no grammar curriculum files found in {path}")

    entries: list[GrammarRecord] = []
    expected_paths: set[str] = set()
    for grammar_file in files:
        match = PATH_FILE_PATTERN.fullmatch(grammar_file.name)
        if is_directory and match is None:
            raise ValueError(
                f"grammar file must name a curriculum path: {grammar_file.name}"
            )
        file_entries = _load_grammar_file(grammar_file)
        if match:
            expected_path = match.group(1)
            expected_paths.add(expected_path)
            if any(entry.path != expected_path for entry in file_entries):
                raise ValueError(
                    f"{grammar_file.name} must contain only {expected_path} entries"
                )
        entries.extend(file_entries)

    if len({entry.id for entry in entries}) != len(entries):
        raise ValueError("grammar IDs must be unique")
    if len({entry.slug for entry in entries}) != len(entries):
        raise ValueError("grammar slugs must be unique")

    represented_paths = {entry.path for entry in entries}
    missing_paths = sorted(expected_paths - represented_paths)
    if missing_paths:
        raise ValueError(f"expected path is not represented: {', '.join(missing_paths)}")
    unexpected_paths = sorted(represented_paths - expected_paths) if expected_paths else []
    if unexpected_paths:
        raise ValueError(
            f"grammar entries have no matching path file: {', '.join(unexpected_paths)}"
        )

    entries.sort(key=lambda entry: entry.display_order)
    expected_order = list(range(1, len(entries) + 1))
    if [entry.display_order for entry in entries] != expected_order:
        raise ValueError(
            f"grammar display_order must be sequential from 1 to {len(entries)}"
        )

    curriculum_ids = {entry.id for entry in entries}
    for entry in entries:
        for related_id in entry.related_entries:
            if related_id not in curriculum_ids:
                raise ValueError(
                    f"grammar related entry {related_id} from {entry.id} is not in curriculum"
                )
    return entries


def validate_grammar_seed(path: Path) -> list[GrammarRecord]:
    """Backward-compatible wrapper for callers that validate one JSON file."""
    return load_grammar_curriculum(path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate the grammar curriculum.")
    parser.add_argument("seed", type=Path, help="Grammar directory or explicit JSON file")
    args = parser.parse_args(argv)
    entries = load_grammar_curriculum(args.seed)
    print(json.dumps({"grammar": len(entries), "valid": True}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
