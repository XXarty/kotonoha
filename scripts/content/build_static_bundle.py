from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.content.build_manifest import build_manifest
from scripts.content.build_search_index import build_search_index
from scripts.content.fetch_sources import sha256_file
from scripts.content.models import (
    BuildManifest,
    ContentSource,
    KanaRecord,
    SourceSnapshot,
    VocabularyRecord,
)
from scripts.content.validate_grammar import load_grammar_curriculum


ATTRIBUTION = """# KOTONOHA public content attribution

## Vocabulary

- JMdict — EDRDG redistribution terms: https://www.edrdg.org/edrdg/licence.html
- Kaikki/Wiktionary Chinese glosses — CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
- Kaikki machine-readable Chinese Wiktionary data: https://kaikki.org/zhwiktionary/rawdata.html

## Grammar

- Tae Kim's Japanese Grammar Guide: https://guidetojapanese.org/learn/grammar
- Direct-source license: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 United States.
- Direct-source license URL: https://creativecommons.org/licenses/by-nc-sa/3.0/us/
- KOTONOHA project-authored extensions: https://github.com/XXarty/kotonoha
- Extension license: All rights reserved.
- Curriculum-context links on extensions are not direct lessons for those grammar points.
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


def _source_json(source: ContentSource) -> dict[str, Any]:
    return source.model_dump(mode="json", exclude_defaults=True)


def _validate_retirement_evidence(
    payload: object,
    vocabulary_ids: set[str],
) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise ValueError("vocabulary retirement evidence must be a JSON object")
    baseline_commit = payload.get("baseline_commit")
    pin_count = payload.get("pin_count")
    retained_ids = payload.get("retained_ids")
    retired = payload.get("retired")
    if (
        not isinstance(baseline_commit, str)
        or re.fullmatch(r"[0-9a-f]{7,40}", baseline_commit) is None
    ):
        raise ValueError("retirement evidence requires a Git baseline commit")
    if not isinstance(pin_count, int) or pin_count < 0:
        raise ValueError("retirement evidence pin_count must be nonnegative")
    if not isinstance(retained_ids, list) or retained_ids != sorted(set(retained_ids)):
        raise ValueError("retained pin IDs must be a sorted unique list")
    if not isinstance(retired, list):
        raise ValueError("retired pin evidence must be a list")
    retired_ids: list[str] = []
    normalized_retired: list[dict[str, str]] = []
    for item in retired:
        if not isinstance(item, dict):
            raise ValueError("each retired pin requires an ID and reason")
        pin_id = item.get("id")
        reason = item.get("reason")
        if (
            not isinstance(pin_id, str)
            or re.fullmatch(r"vocabulary:jmdict:[0-9]+", pin_id) is None
            or not isinstance(reason, str)
            or not reason.strip()
        ):
            raise ValueError("each retired pin requires a valid ID and reason")
        retired_ids.append(pin_id)
        normalized_retired.append({"id": pin_id, "reason": reason.strip()})
    if normalized_retired != sorted(normalized_retired, key=lambda item: item["id"]):
        raise ValueError("retired pin evidence must be sorted by ID")
    if len(set(retired_ids)) != len(retired_ids):
        raise ValueError("retired pin IDs must be unique")
    retained_set = set(retained_ids)
    retired_set = set(retired_ids)
    if retained_set.intersection(retired_set) or len(retained_set | retired_set) != pin_count:
        raise ValueError("retirement evidence must partition every pin")
    if not retained_set.issubset(vocabulary_ids) or retired_set.intersection(vocabulary_ids):
        raise ValueError("retirement evidence does not match the published vocabulary")
    return {
        "baseline_commit": baseline_commit,
        "pin_count": pin_count,
        "retained_ids": retained_ids,
        "retired": normalized_retired,
    }


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
    retirements_path: Path,
    output_dir: Path,
    public_dir: Path,
    built_at: datetime | None = None,
    minimum_vocabulary: int = 500,
) -> BuildManifest:
    vocabulary = [VocabularyRecord.model_validate(item) for item in _read_json(vocabulary_path)]
    grammar = load_grammar_curriculum(grammar_path)
    kana = [KanaRecord.model_validate(item) for item in _read_json(kana_path)]
    sources, snapshots = _load_source_metadata(source_metadata_path)
    source_ids = {source.id for source in sources}
    enabled_source_ids = {source.id for source in sources if source.enabled}
    published_source_ids = {
        record.source_id for record in [*vocabulary, *grammar, *kana]
    }
    unknown_source_ids = published_source_ids - source_ids
    if unknown_source_ids:
        raise ValueError(
            "published content references unknown sources: "
            + ", ".join(sorted(unknown_source_ids))
        )
    snapshot_source_ids = {snapshot.source_id for snapshot in snapshots}
    missing_snapshot_ids = (published_source_ids & enabled_source_ids) - snapshot_source_ids
    if missing_snapshot_ids:
        raise ValueError(
            "enabled published sources require snapshots: "
            + ", ".join(sorted(missing_snapshot_ids))
        )
    rejection_counts = {str(key): int(value) for key, value in _read_json(rejections_path).items()}
    retirement_evidence = _validate_retirement_evidence(
        _read_json(retirements_path),
        {record.id for record in vocabulary},
    )

    if len(vocabulary) < minimum_vocabulary:
        raise ValueError(f"launch bundle requires at least {minimum_vocabulary} vocabulary entries")
    if len(grammar) != 120:
        raise ValueError(f"launch bundle requires exactly 120 grammar entries, got {len(grammar)}")
    if len(kana) != 46:
        raise ValueError(f"launch bundle requires exactly 46 kana entries, got {len(kana)}")

    temporary = output_dir.parent / f".{output_dir.name}.tmp"
    temporary_public = public_dir.parent / f".{public_dir.name}.tmp"
    shutil.rmtree(temporary, ignore_errors=True)
    shutil.rmtree(temporary_public, ignore_errors=True)
    temporary.mkdir(parents=True)
    (temporary_public / "content").mkdir(parents=True)
    try:
        source_payload = {
            "sources": [_source_json(source) for source in sources],
            "snapshots": [
                snapshot.model_dump(mode="json", exclude_none=True)
                for snapshot in snapshots
            ],
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
        _write_json(temporary / "vocabulary-retirements.json", retirement_evidence)
        (temporary / "ATTRIBUTION.md").write_text(ATTRIBUTION, encoding="utf-8")
        _write_json(
            temporary_public / "content/search-index.json",
            build_search_index(
                [record for record in vocabulary if record.source_id in enabled_source_ids],
                [record for record in grammar if record.source_id in enabled_source_ids],
                [record for record in kana if record.source_id in enabled_source_ids],
            ),
        )

        hashed_files = [
            "sources.json",
            "vocabulary.json",
            "grammar.json",
            "kana.json",
            "vocabulary-retirements.json",
            "ATTRIBUTION.md",
        ]
        files = {filename: sha256_file(temporary / filename) for filename in hashed_files}
        files["public/content/search-index.json"] = sha256_file(
            temporary_public / "content/search-index.json"
        )
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
        manifest_payload = manifest.model_dump(mode="json", exclude_none=True)
        manifest_payload["sources"] = [_source_json(source) for source in sources]
        _write_json(temporary / "manifest.json", manifest_payload)
        _write_json(
            temporary / "verification.json",
            {
                "counts": manifest.counts,
                "manifest_sha256": sha256_file(temporary / "manifest.json"),
                "verified_at": manifest.built_at.isoformat().replace("+00:00", "Z"),
                "verifier_version": 1,
            },
        )
        verify_static_bundle(temporary, temporary_public)

        output_dir.mkdir(parents=True, exist_ok=True)
        (public_dir / "content").mkdir(parents=True, exist_ok=True)
        for filename in [*hashed_files, "manifest.json", "verification.json"]:
            (temporary / filename).replace(output_dir / filename)
        (temporary_public / "content/search-index.json").replace(
            public_dir / "content/search-index.json"
        )
        return manifest
    finally:
        shutil.rmtree(temporary, ignore_errors=True)
        shutil.rmtree(temporary_public, ignore_errors=True)


def verify_static_bundle(output_dir: Path, public_dir: Path | None = None) -> BuildManifest:
    manifest = BuildManifest.model_validate(_read_json(output_dir / "manifest.json"))
    verification = _read_json(output_dir / "verification.json")
    actual_manifest_sha256 = sha256_file(output_dir / "manifest.json")
    if verification.get("manifest_sha256") != actual_manifest_sha256:
        raise ValueError("verification manifest hash mismatch")
    if verification.get("counts") != manifest.counts:
        raise ValueError("verification count mismatch")
    for filename, expected_sha256 in manifest.files.items():
        if filename == "public/content/search-index.json":
            if public_dir is None:
                raise ValueError("public_dir is required to verify the public search index")
            file_path = public_dir / "content/search-index.json"
        else:
            file_path = output_dir / filename
        actual_sha256 = sha256_file(file_path)
        if actual_sha256 != expected_sha256:
            raise ValueError(
                f"bundle hash mismatch for {filename}: expected {expected_sha256}, got {actual_sha256}"
            )
    vocabulary_payload = _read_json(output_dir / "vocabulary.json")
    grammar_payload = _read_json(output_dir / "grammar.json")
    kana_payload = _read_json(output_dir / "kana.json")
    actual_counts = {
        "vocabulary": len(vocabulary_payload),
        "grammar": len(grammar_payload),
        "kana": len(kana_payload),
        "invalid": 0,
    }
    if manifest.counts != actual_counts:
        raise ValueError(f"bundle count mismatch: expected {manifest.counts}, got {actual_counts}")
    vocabulary_ids = {str(item["id"]) for item in vocabulary_payload}
    _validate_retirement_evidence(
        _read_json(output_dir / "vocabulary-retirements.json"),
        vocabulary_ids,
    )
    if public_dir is None:
        raise ValueError("public_dir is required to verify the public search index")
    sources, _snapshots = _load_source_metadata(output_dir / "sources.json")
    enabled_source_ids = {source.id for source in sources if source.enabled}
    enabled_content_ids = {
        str(item["id"])
        for items in (vocabulary_payload, grammar_payload, kana_payload)
        for item in items
        if item["source_id"] in enabled_source_ids
    }
    search_payload = _read_json(public_dir / "content/search-index.json")
    search_ids = [str(row["id"]) for row in search_payload]
    if len(search_ids) != len(set(search_ids)):
        raise ValueError("duplicate public search index IDs")
    if set(search_ids) != enabled_content_ids:
        raise ValueError("public search index IDs do not match enabled content IDs")
    return manifest


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build or verify committed static content files.")
    parser.add_argument("--verify", type=Path)
    parser.add_argument("--vocabulary", type=Path)
    parser.add_argument("--grammar", type=Path)
    parser.add_argument("--kana", type=Path)
    parser.add_argument("--source-metadata", type=Path)
    parser.add_argument("--rejections", type=Path)
    parser.add_argument("--retirements", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--public-dir", type=Path)
    args = parser.parse_args(argv)
    if args.verify is None and not all(
        [
            args.vocabulary,
            args.grammar,
            args.kana,
            args.source_metadata,
            args.rejections,
            args.retirements,
            args.output,
            args.public_dir,
        ]
    ):
        parser.error("build mode requires all input and output arguments")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.verify is not None:
        manifest = verify_static_bundle(args.verify, args.public_dir)
    else:
        manifest = build_static_bundle(
            vocabulary_path=args.vocabulary,
            grammar_path=args.grammar,
            kana_path=args.kana,
            source_metadata_path=args.source_metadata,
            rejections_path=args.rejections,
            retirements_path=args.retirements,
            output_dir=args.output,
            public_dir=args.public_dir,
        )
    print(json.dumps(manifest.counts, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
