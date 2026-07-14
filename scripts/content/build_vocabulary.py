from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pykakasi import kakasi

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.content.models import VocabularyRecord, normalize_text, vocabulary_id


@dataclass(frozen=True)
class JMdictCandidate:
    entry_id: str
    japanese: str
    kana: str
    part_of_speech: tuple[str, ...]
    meaning_en: tuple[str, ...]


@dataclass(frozen=True)
class VocabularyBuild:
    records: tuple[VocabularyRecord, ...]
    rejection_counts: dict[str, int]

    def json_bytes(self) -> bytes:
        payload = [record.model_dump(mode="json") for record in self.records]
        return (json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()


def _compatible_reading(reading: dict[str, Any], spelling: str, has_kanji: bool) -> bool:
    applies_to = reading.get("appliesToKanji") or []
    if not has_kanji:
        return not applies_to or "*" in applies_to
    return "*" in applies_to or spelling in applies_to


def _pick_candidate(word: dict[str, Any]) -> JMdictCandidate | None:
    entry_id = normalize_text(str(word.get("id", "")))
    if not entry_id.isascii() or not entry_id.isdigit():
        return None

    kanji = [item for item in word.get("kanji", []) if normalize_text(str(item.get("text", "")))]
    readings = [item for item in word.get("kana", []) if normalize_text(str(item.get("text", "")))]
    if not readings:
        return None

    chosen_kanji = next((item for item in kanji if item.get("common") is True), None)
    chosen_kanji = chosen_kanji or (kanji[0] if kanji else None)
    japanese = normalize_text(str(chosen_kanji["text"] if chosen_kanji else readings[0]["text"]))
    compatible = [
        reading
        for reading in readings
        if _compatible_reading(reading, japanese, chosen_kanji is not None)
    ]
    if not compatible:
        return None
    chosen_reading = next((item for item in compatible if item.get("common") is True), compatible[0])
    kana = normalize_text(str(chosen_reading["text"]))

    for sense in word.get("sense", []):
        part_of_speech = tuple(
            dict.fromkeys(normalize_text(str(tag)) for tag in sense.get("partOfSpeech", []) if tag)
        )
        english = tuple(
            dict.fromkeys(
                normalize_text(str(gloss.get("text", "")))
                for gloss in sense.get("gloss", [])
                if gloss.get("lang") == "eng" and normalize_text(str(gloss.get("text", "")))
            )
        )
        if part_of_speech and english:
            return JMdictCandidate(entry_id, japanese, kana, part_of_speech, english)
    return None


def select_jmdict_candidates(root: dict[str, Any]) -> list[JMdictCandidate]:
    if root.get("commonOnly") is not True:
        raise ValueError("JMdict input must be a common-only distribution")
    return [candidate for word in root.get("words", []) if (candidate := _pick_candidate(word))]


def index_kaikki_glosses(
    path: Path,
    wanted_spellings: set[str],
) -> dict[str, set[tuple[str, ...]]]:
    index: dict[str, set[tuple[str, ...]]] = defaultdict(set)
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid Kaikki JSONL at {path}:{line_number}") from exc
        word = normalize_text(str(row.get("word", "")))
        if row.get("lang_code") != "ja" or word not in wanted_spellings:
            continue
        glosses = tuple(
            dict.fromkeys(
                normalize_text(str(gloss))
                for sense in row.get("senses", [])
                for gloss in sense.get("glosses", [])
                if normalize_text(str(gloss))
            )
        )
        if glosses:
            index[word].add(glosses)
    return dict(index)


def _category(part_of_speech: tuple[str, ...]) -> str:
    tags = tuple(tag.lower() for tag in part_of_speech)
    if any(tag.startswith(("n", "pron")) for tag in tags):
        return "nouns"
    if any(tag.startswith("v") for tag in tags):
        return "verbs"
    if any(tag.startswith("adj") for tag in tags):
        return "adjectives"
    return "other"


_ROMANIZER = kakasi()


def romanize_kana(value: str) -> str:
    return "".join(part["hepburn"] for part in _ROMANIZER.convert(value))


def build_vocabulary(jmdict_path: Path, kaikki_path: Path, limit: int) -> VocabularyBuild:
    if limit < 1:
        raise ValueError("limit must be positive")
    root = json.loads(jmdict_path.read_text(encoding="utf-8"))
    candidates = select_jmdict_candidates(root)
    gloss_index = index_kaikki_glosses(kaikki_path, {item.japanese for item in candidates})
    rejections: Counter[str] = Counter()
    records: list[VocabularyRecord] = []
    content_version = normalize_text(str(root.get("dictDate", "unknown")))

    for candidate in candidates:
        gloss_sets = gloss_index.get(candidate.japanese, set())
        if not gloss_sets:
            rejections["missing_chinese"] += 1
            continue
        if len(gloss_sets) != 1:
            rejections["ambiguous_chinese"] += 1
            continue
        meaning_zh = list(next(iter(gloss_sets)))
        category = _category(candidate.part_of_speech)
        records.append(
            VocabularyRecord(
                id=vocabulary_id(candidate.entry_id),
                source_id="jmdict-kaikki",
                source_key=f"jmdict:{candidate.entry_id}",
                category=category,
                list_name=f"common-{category}",
                japanese=candidate.japanese,
                kana=candidate.kana,
                romaji=romanize_kana(candidate.kana),
                part_of_speech=list(candidate.part_of_speech),
                meaning_zh=meaning_zh,
                meaning_en=list(candidate.meaning_en),
                meaning_zh_source="kaikki-zhwiktionary",
                content_version=content_version,
                published=True,
            )
        )

    records.sort(key=lambda item: (item.category, item.kana, item.japanese, item.id))
    return VocabularyBuild(tuple(records[:limit]), dict(sorted(rejections.items())))


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a validated JMdict/Kaikki vocabulary bundle.")
    parser.add_argument("--jmdict", type=Path, required=True)
    parser.add_argument("--kaikki", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=2000)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--rejections", type=Path, required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    result = build_vocabulary(args.jmdict, args.kaikki, args.limit)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.rejections.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(result.json_bytes())
    args.rejections.write_text(
        json.dumps(result.rejection_counts, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {"published": len(result.records), "rejections": result.rejection_counts},
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
