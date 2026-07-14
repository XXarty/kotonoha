from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pykakasi import kakasi

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.content.models import VocabularyRecord, normalize_text, vocabulary_id


_KAIKKI_SECTION_MARKER = re.compile(r"={2,}\s*日[语語]\s*={2,}")


@dataclass(frozen=True)
class JMdictCandidate:
    entry_id: str
    common: bool
    priority_tags: tuple[str, ...]
    japanese: str
    kana: str
    part_of_speech: tuple[str, ...]
    meaning_en: tuple[str, ...]


@dataclass(frozen=True)
class KaikkiCandidate:
    word: str
    readings: tuple[str, ...]
    part_of_speech: tuple[str, ...]
    glosses: tuple[str, ...]


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
            common = bool(
                (chosen_kanji and chosen_kanji.get("common") is True)
                or chosen_reading.get("common") is True
            )
            return JMdictCandidate(
                entry_id=entry_id,
                common=common,
                priority_tags=("common",) if common else (),
                japanese=japanese,
                kana=kana,
                part_of_speech=part_of_speech,
                meaning_en=english,
            )
    return None


def select_jmdict_candidates(root: dict[str, Any]) -> list[JMdictCandidate]:
    if root.get("commonOnly") not in {True, False}:
        raise ValueError("JMdict input must declare commonOnly as true or false")
    return [candidate for word in root.get("words", []) if (candidate := _pick_candidate(word))]


_READING_TAGS = frozenset({"hiragana", "katakana", "kana", "reading"})


def _normalized_strings(value: object) -> tuple[str, ...]:
    values = (value,) if isinstance(value, str) else value if isinstance(value, list) else ()
    return tuple(
        dict.fromkeys(
            normalized
            for item in values
            if isinstance(item, str) and (normalized := normalize_text(item).casefold())
        )
    )


def _kaikki_readings(row: dict[str, Any]) -> tuple[str, ...]:
    readings: list[str] = []
    for form in row.get("forms", []):
        if not isinstance(form, dict):
            continue
        tags = set(_normalized_strings(form.get("tags", [])))
        reading = normalize_text(str(form.get("form", "")))
        if reading and tags.intersection(_READING_TAGS):
            readings.append(reading)
    return tuple(dict.fromkeys(readings))


def _kaikki_part_of_speech(row: dict[str, Any]) -> tuple[str, ...]:
    values = list(_normalized_strings(row.get("pos", [])))
    for sense in row.get("senses", []):
        if isinstance(sense, dict):
            values.extend(_normalized_strings(sense.get("pos", [])))
    return tuple(dict.fromkeys(values))


def index_kaikki_glosses(
    path: Path,
    wanted_spellings: set[str],
) -> tuple[
    dict[tuple[str, str], set[KaikkiCandidate]],
    dict[str, set[KaikkiCandidate]],
]:
    exact: dict[tuple[str, str], set[KaikkiCandidate]] = defaultdict(set)
    spelling_only: dict[str, set[KaikkiCandidate]] = defaultdict(set)
    open_text = gzip.open if path.suffix == ".gz" else Path.open
    with open_text(path, "rt", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
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
                    cleaned
                    for sense in row.get("senses", [])
                    for gloss in sense.get("glosses", [])
                    if (cleaned := _clean_kaikki_gloss(gloss))
                )
            )
            if glosses:
                candidate = KaikkiCandidate(
                    word=word,
                    readings=_kaikki_readings(row),
                    part_of_speech=_kaikki_part_of_speech(row),
                    glosses=glosses,
                )
                spelling_only[word].add(candidate)
                for reading in candidate.readings:
                    exact[(word, reading)].add(candidate)
    return dict(exact), dict(spelling_only)


def _clean_kaikki_gloss(value: object) -> str:
    normalized = normalize_text(str(value))
    return _KAIKKI_SECTION_MARKER.split(normalized, maxsplit=1)[0].strip()


def _category(part_of_speech: tuple[str, ...]) -> str:
    tags = tuple(tag.lower() for tag in part_of_speech)
    if any(tag.startswith(("n", "pron")) for tag in tags):
        return "nouns"
    if any(tag.startswith("v") for tag in tags):
        return "verbs"
    if any(tag.startswith("adj") for tag in tags):
        return "adjectives"
    return "other"


def _pos_family(tag: str) -> str:
    normalized = normalize_text(tag).casefold()
    if "adjective" in normalized or normalized.startswith("adj"):
        return "adjective"
    if "adverb" in normalized or normalized.startswith("adv"):
        return "adverb"
    if "verb" in normalized or normalized.startswith("v"):
        return "verb"
    if (
        "noun" in normalized
        or normalized.startswith(("n", "pron", "num", "ctr"))
    ):
        return "noun"
    return normalized


def _compatible_pos(jmdict: JMdictCandidate, kaikki: KaikkiCandidate) -> bool:
    jmdict_families = {_pos_family(tag) for tag in jmdict.part_of_speech}
    kaikki_families = {_pos_family(tag) for tag in kaikki.part_of_speech}
    return bool(jmdict_families.intersection(kaikki_families))


_ROMANIZER = kakasi()


def romanize_kana(value: str) -> str:
    return "".join(part["hepburn"] for part in _ROMANIZER.convert(value))


def limit_balanced_records(
    records: list[VocabularyRecord],
    limit: int,
) -> list[VocabularyRecord]:
    """Select a deterministic launch slice without starving later categories."""
    ordered_categories = ("nouns", "verbs", "adjectives", "other")
    grouped = {
        category: sorted(
            (record for record in records if record.category == category),
            key=lambda item: (item.kana, item.japanese, item.id),
        )
        for category in ordered_categories
    }
    offsets = {category: 0 for category in ordered_categories}
    selected: list[VocabularyRecord] = []

    while len(selected) < limit:
        added = False
        for category in ordered_categories:
            offset = offsets[category]
            if offset >= len(grouped[category]):
                continue
            selected.append(grouped[category][offset])
            offsets[category] += 1
            added = True
            if len(selected) == limit:
                break
        if not added:
            break

    return sorted(selected, key=lambda item: (item.category, item.kana, item.japanese, item.id))


def build_vocabulary(
    jmdict_path: Path,
    kaikki_path: Path,
    limit: int = 10_000,
    core_limit: int = 5_000,
) -> VocabularyBuild:
    if limit < 1:
        raise ValueError("limit must be positive")
    if core_limit < 0:
        raise ValueError("core_limit must be nonnegative")
    core_limit = min(core_limit, limit)
    root = json.loads(jmdict_path.read_text(encoding="utf-8"))
    candidates = select_jmdict_candidates(root)
    exact_index, spelling_index = index_kaikki_glosses(
        kaikki_path,
        {item.japanese for item in candidates},
    )
    rejections: Counter[str] = Counter()
    records: list[VocabularyRecord] = []
    content_version = normalize_text(str(root.get("dictDate", "unknown")))

    for candidate in candidates:
        matches = exact_index.get((candidate.japanese, candidate.kana), set())
        if not matches:
            spelling_matches = spelling_index.get(candidate.japanese, set())
            if not spelling_matches:
                rejections["missing_chinese"] += 1
                continue
            matches = {item for item in spelling_matches if not item.readings}
            if not matches:
                rejections["reading_mismatch"] += 1
                continue

        compatible_matches = {item for item in matches if _compatible_pos(candidate, item)}
        if not compatible_matches:
            rejections["pos_mismatch"] += 1
            continue
        gloss_sets = {item.glosses for item in compatible_matches}
        if not gloss_sets:
            rejections["missing_chinese"] += 1
            continue
        if len(gloss_sets) != 1:
            rejections["ambiguous_chinese"] += 1
            continue
        meaning_zh = list(next(iter(gloss_sets)))
        category = _category(candidate.part_of_speech)
        tier = "core" if candidate.common else "extended"
        records.append(
            VocabularyRecord(
                id=vocabulary_id(candidate.entry_id),
                source_id="jmdict-kaikki",
                source_key=f"jmdict:{candidate.entry_id}",
                category=category,
                list_name=f"{tier}-{category}",
                japanese=candidate.japanese,
                kana=candidate.kana,
                romaji=romanize_kana(candidate.kana),
                part_of_speech=list(candidate.part_of_speech),
                meaning_zh=meaning_zh,
                meaning_en=list(candidate.meaning_en),
                meaning_zh_source="kaikki-zhwiktionary",
                tier=tier,
                priority_tags=list(candidate.priority_tags),
                content_version=content_version,
                published=True,
            )
        )

    core_records = sorted(
        (record for record in records if record.tier == "core"),
        key=lambda item: (item.category, item.kana, item.japanese, item.id),
    )
    extended_records = sorted(
        (record for record in records if record.tier == "extended"),
        key=lambda item: (item.category, item.kana, item.japanese, item.id),
    )
    selected_core = limit_balanced_records(core_records, core_limit)
    selected_extended = limit_balanced_records(extended_records, limit - len(selected_core))
    selected = selected_core + selected_extended
    return VocabularyBuild(tuple(selected), dict(sorted(rejections.items())))


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a validated JMdict/Kaikki vocabulary bundle.")
    parser.add_argument("--jmdict", type=Path, required=True)
    parser.add_argument("--kaikki", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=10_000)
    parser.add_argument("--core-limit", type=int, default=5_000)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--rejections", type=Path, required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    result = build_vocabulary(args.jmdict, args.kaikki, args.limit, args.core_limit)
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
