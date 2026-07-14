from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.content.build_manifest import build_manifest
from scripts.content.fetch_sources import sha256_file
from scripts.content.models import (
    BuildManifest,
    ContentSource,
    GrammarRecord,
    KanaRecord,
    SourceSnapshot,
    VocabularyRecord,
)


ATTRIBUTION = """# KOTONOHA public content attribution

## Vocabulary

- JMdict by the Electronic Dictionary Research and Development Group: https://www.edrdg.org/edrdg/licence.html
- Kaikki machine-readable Chinese Wiktionary data: https://kaikki.org/zhwiktionary/rawdata.html
- License: Creative Commons Attribution-ShareAlike 4.0.

## Grammar

- Tae Kim's Japanese Grammar Guide: https://guidetojapanese.org/learn/grammar
- License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 United States.
- KOTONOHA reorganized the syllabus and wrote new concise Chinese explanations and examples.
- This grammar bundle and the site that enables it must remain noncommercial.

## Kana

- The 46-pair factual table was arranged by KOTONOHA and released under CC0 1.0.
"""


def canonical_json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, value: object) -> None:
    path.write_bytes(canonical_json_bytes(value))


def _load_source_metadata(path: Path) -> tuple[list[ContentSource], list[SourceSnapshot]]:
    payload = _read_json(path)
    sources = [ContentSource.model_validate(item) for item in payload.get("sources", [])]
    snapshots = [SourceSnapshot.model_validate(item) for item in payload.get("snapshots", [])]
    if not sources or not snapshots:
        raise ValueError("source metadata requires nonempty sources and snapshots")
    source_ids = {source.id for source in sources}
    if any(snapshot.source_id not in source_ids for snapshot in snapshots):
        raise ValueError("every snapshot source_id must exist in sources")
    return sources, snapshots


def _default_built_at(snapshots: list[SourceSnapshot]) -> datetime:
    return max(snapshot.downloaded_at for snapshot in snapshots).astimezone(timezone.utc)


def build_static_bundle(
    *,
    vocabulary_path: Path,
    grammar_path: Path,
    kana_path: Path,
    source_metadata_path: Path,
    rejections_path: Path,
    output_dir: Path,
    built_at: datetime | None = None,
    minimum_vocabulary: int = 500,
) -> BuildManifest:
    vocabulary = [VocabularyRecord.model_validate(item) for item in _read_json(vocabulary_path)]
    grammar = [GrammarRecord.model_validate(item) for item in _read_json(grammar_path)]
    kana = [KanaRecord.model_validate(item) for item in _read_json(kana_path)]
    sources, snapshots = _load_source_metadata(source_metadata_path)
    rejection_counts = {str(key): int(value) for key, value in _read_json(rejections_path).items()}

    if len(vocabulary) < minimum_vocabulary:
        raise ValueError(f"launch bundle requires at least {minimum_vocabulary} vocabulary entries")
    if len(grammar) != 30:
        raise ValueError(f"launch bundle requires exactly 30 grammar entries, got {len(grammar)}")
    if len(kana) != 46:
        raise ValueError(f"launch bundle requires exactly 46 kana entries, got {len(kana)}")

    temporary = output_dir.parent / f".{output_dir.name}.tmp"
    shutil.rmtree(temporary, ignore_errors=True)
    temporary.mkdir(parents=True)
    try:
        source_payload = {
            "sources": [source.model_dump(mode="json") for source in sources],
            "snapshots": [snapshot.model_dump(mode="json") for snapshot in snapshots],
        }
        _write_json(temporary / "sources.json", source_payload)
        _write_json(
            temporary / "vocabulary.json",
            [record.model_dump(mode="json") for record in vocabulary],
        )
        _write_json(
            temporary / "grammar.json",
            [record.model_dump(mode="json") for record in grammar],
        )
        _write_json(
            temporary / "kana.json",
            [record.model_dump(mode="json") for record in kana],
        )
        (temporary / "ATTRIBUTION.md").write_text(ATTRIBUTION, encoding="utf-8")

        hashed_files = [
            "sources.json",
            "vocabulary.json",
            "grammar.json",
            "kana.json",
            "ATTRIBUTION.md",
        ]
        files = {filename: sha256_file(temporary / filename) for filename in hashed_files}
        manifest = build_manifest(
            sources=sources,
            snapshots=snapshots,
            counts={
                "vocabulary": len(vocabulary),
                "grammar": len(grammar),
                "kana": len(kana),
                "invalid": 0,
            },
            rejection_counts=rejection_counts,
            files=files,
            built_at=built_at or _default_built_at(snapshots),
        )
        _write_json(temporary / "manifest.json", manifest.model_dump(mode="json"))
        _write_json(
            temporary / "verification.json",
            {
                "counts": manifest.counts,
                "manifest_sha256": sha256_file(temporary / "manifest.json"),
                "verified_at": manifest.built_at.isoformat().replace("+00:00", "Z"),
                "verifier_version": 1,
            },
        )
        verify_static_bundle(temporary)

        output_dir.mkdir(parents=True, exist_ok=True)
        for filename in [*hashed_files, "manifest.json", "verification.json"]:
            (temporary / filename).replace(output_dir / filename)
        return manifest
    finally:
        shutil.rmtree(temporary, ignore_errors=True)


def verify_static_bundle(output_dir: Path) -> BuildManifest:
    manifest = BuildManifest.model_validate(_read_json(output_dir / "manifest.json"))
    verification = _read_json(output_dir / "verification.json")
    actual_manifest_sha256 = sha256_file(output_dir / "manifest.json")
    if verification.get("manifest_sha256") != actual_manifest_sha256:
        raise ValueError("verification manifest hash mismatch")
    if verification.get("counts") != manifest.counts:
        raise ValueError("verification count mismatch")
    for filename, expected_sha256 in manifest.files.items():
        actual_sha256 = sha256_file(output_dir / filename)
        if actual_sha256 != expected_sha256:
            raise ValueError(
                f"bundle hash mismatch for {filename}: expected {expected_sha256}, got {actual_sha256}"
            )
    actual_counts = {
        "vocabulary": len(_read_json(output_dir / "vocabulary.json")),
        "grammar": len(_read_json(output_dir / "grammar.json")),
        "kana": len(_read_json(output_dir / "kana.json")),
        "invalid": 0,
    }
    if manifest.counts != actual_counts:
        raise ValueError(f"bundle count mismatch: expected {manifest.counts}, got {actual_counts}")
    return manifest


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build or verify committed static content files.")
    parser.add_argument("--verify", type=Path)
    parser.add_argument("--vocabulary", type=Path)
    parser.add_argument("--grammar", type=Path)
    parser.add_argument("--kana", type=Path)
    parser.add_argument("--source-metadata", type=Path)
    parser.add_argument("--rejections", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    if args.verify is None and not all(
        [args.vocabulary, args.grammar, args.kana, args.source_metadata, args.rejections, args.output]
    ):
        parser.error("build mode requires all input and output arguments")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.verify is not None:
        manifest = verify_static_bundle(args.verify)
    else:
        manifest = build_static_bundle(
            vocabulary_path=args.vocabulary,
            grammar_path=args.grammar,
            kana_path=args.kana,
            source_metadata_path=args.source_metadata,
            rejections_path=args.rejections,
            output_dir=args.output,
        )
    print(json.dumps(manifest.counts, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
