from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Literal, TypedDict
from urllib.parse import quote

from pydantic import BaseModel, ConfigDict, Field, model_validator

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.content.models import (
    GrammarRecord,
    KanaRecord,
    NonBlankText,
    VocabularyRecord,
    grammar_id,
    kana_id,
    vocabulary_id,
)


class SearchIndexRow(TypedDict):
    id: str
    kind: str
    primary: str
    reading: str
    romaji: str
    meaning: str
    href: str


class _VerifiedVocabularyIndexSource(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    id: str = Field(pattern=r"^vocabulary:jmdict:[0-9]+$")
    kind: Literal["vocabulary"]
    source_key: str = Field(pattern=r"^jmdict:[0-9]+$")
    japanese: NonBlankText
    kana: NonBlankText
    romaji: NonBlankText
    meaning_zh: list[NonBlankText] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_identity(self) -> _VerifiedVocabularyIndexSource:
        if self.id != vocabulary_id(self.source_key.removeprefix("jmdict:")):
            raise ValueError("vocabulary ID must match source_key")
        return self


class _VerifiedGrammarIndexSource(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    id: str = Field(pattern=r"^grammar:tae-kim:[a-z0-9-]+$")
    kind: Literal["grammar"]
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    expression: NonBlankText
    explanation_zh: NonBlankText

    @model_validator(mode="after")
    def validate_identity(self) -> _VerifiedGrammarIndexSource:
        if self.id != grammar_id(self.slug):
            raise ValueError("grammar ID must match slug")
        return self


class _VerifiedKanaIndexSource(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    id: str = Field(pattern=r"^kana:gojuon:[a-z]+$")
    kind: Literal["kana"]
    hiragana: NonBlankText
    katakana: NonBlankText
    romaji: str = Field(pattern=r"^[a-z]+$")
    row_group: NonBlankText

    @model_validator(mode="after")
    def validate_identity(self) -> _VerifiedKanaIndexSource:
        if self.id != kana_id(self.romaji):
            raise ValueError("kana ID must match romaji")
        return self


def build_search_index(
    vocabulary: list[VocabularyRecord],
    grammar: list[GrammarRecord],
    kana: list[KanaRecord],
) -> list[SearchIndexRow]:
    rows: list[SearchIndexRow] = []
    rows.extend(
        {
            "id": record.id,
            "kind": record.kind,
            "primary": record.japanese,
            "reading": record.kana,
            "romaji": record.romaji,
            "meaning": record.meaning_zh[0],
            "href": f"/vocabulary/entry/{quote(record.id, safe='')}",
        }
        for record in vocabulary
    )
    rows.extend(
        {
            "id": record.id,
            "kind": record.kind,
            "primary": record.expression,
            "reading": "",
            "romaji": "",
            "meaning": record.explanation_zh,
            "href": f"/grammar/entry/{record.slug}",
        }
        for record in grammar
    )
    rows.extend(
        {
            "id": record.id,
            "kind": record.kind,
            "primary": f"{record.hiragana} · {record.katakana}",
            "reading": "",
            "romaji": record.romaji,
            "meaning": record.row_group,
            "href": "/kana",
        }
        for record in kana
    )
    rows.sort(key=lambda row: (row["kind"], row["primary"], row["id"]))
    return rows


def canonical_json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()


def _read_records(path: Path, model: type[BaseModel]):
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"content input must be a JSON array: {path}")
    return [model.model_validate(item) for item in payload]


def _write_rows(output_path: Path, rows: list[SearchIndexRow]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_name(f".{output_path.name}.tmp")
    try:
        temporary.write_bytes(canonical_json_bytes(rows))
        temporary.replace(output_path)
    finally:
        temporary.unlink(missing_ok=True)


def write_search_index(
    *, vocabulary_path: Path, grammar_path: Path, kana_path: Path, output_path: Path
) -> list[SearchIndexRow]:
    rows = build_search_index(
        _read_records(vocabulary_path, VocabularyRecord),
        _read_records(grammar_path, GrammarRecord),
        _read_records(kana_path, KanaRecord),
    )
    _write_rows(output_path, rows)
    return rows


def write_verified_bundle_search_index(
    *, bundle_dir: Path, output_path: Path
) -> list[SearchIndexRow]:
    from scripts.content.build_static_bundle import verify_static_bundle

    verify_static_bundle(bundle_dir)
    rows = build_search_index(
        _read_records(bundle_dir / "vocabulary.json", _VerifiedVocabularyIndexSource),
        _read_records(bundle_dir / "grammar.json", _VerifiedGrammarIndexSource),
        _read_records(bundle_dir / "kana.json", _VerifiedKanaIndexSource),
    )
    _write_rows(output_path, rows)
    return rows


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the compact public search index.")
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--bundle", type=Path)
    inputs.add_argument("--vocabulary", type=Path)
    parser.add_argument("--grammar", type=Path)
    parser.add_argument("--kana", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    if args.bundle is not None:
        rows = write_verified_bundle_search_index(
            bundle_dir=args.bundle,
            output_path=args.output,
        )
    else:
        if args.grammar is None or args.kana is None:
            parser.error("--vocabulary requires --grammar and --kana")
        rows = write_search_index(
            vocabulary_path=args.vocabulary,
            grammar_path=args.grammar,
            kana_path=args.kana,
            output_path=args.output,
        )
    print(json.dumps({"search_index": len(rows)}, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
