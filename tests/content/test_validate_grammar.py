from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

import pytest

from scripts.content.validate_grammar import load_grammar_curriculum


ROOT = Path(__file__).resolve().parents[2]
GRAMMAR_DIR = ROOT / "data/content/grammar"
FOUNDATION = GRAMMAR_DIR / "tae-kim-foundation.zh.json"

EXPECTED_FOUNDATION_SLUGS = [
    "da-desu",
    "wa-topic",
    "mo-also",
    "ga-subject",
    "no-possession",
    "i-adjectives",
    "na-adjectives",
    "verb-groups",
    "verb-negative",
    "past-tense",
    "te-form",
    "aru-iru",
    "wo-object",
    "ni-particle",
    "e-particle",
    "de-particle",
    "to-particle",
    "kara-made",
    "masen-ka",
    "tai-desire",
    "te-iru",
    "te-kudasai",
    "te-mo-ii",
    "te-wa-ikenai",
    "koto-ga-dekiru",
    "tsumori",
    "to-omou",
    "tari-tari",
    "ta-koto-ga-aru",
    "kara-reason",
]

EXPECTED_CORE_SLUGS = [
    "polite-masu",
    "addressing-people",
    "ka-question",
    "te-combinations",
    "potential-form",
    "ni-suru-ni-naru",
    "ba-conditional",
    "tara-conditional",
    "nara-conditional",
    "to-conditional",
    "nakereba-naranai",
    "nakute-mo-ii",
    "hoshii-desire",
    "tagaru-desire",
    "volitional-form",
    "to-quotation",
    "tte-quotation",
    "to-iu-definition",
    "you-to-suru",
    "te-miru",
    "ageru",
    "kureru",
    "morau",
    "kudasai-request",
    "nasai-command",
    "imperative-form",
    "counters",
    "relative-clauses",
    "transitive-intransitive",
    "explanatory-no-da",
]

EXPECTED_EXPRESSIONS_SLUGS = [
    "passive-form",
    "causative-form",
    "causative-passive",
    "honorific-verbs",
    "humble-verbs",
    "te-shimau",
    "generic-koto",
    "generic-mono",
    "wake-explanation",
    "hazu-expectation",
    "beki-should",
    "you-similarity",
    "mitai-similarity",
    "rashii-similarity",
    "sou-appearance",
    "sou-hearsay",
    "yori-hou-comparison",
    "yasui-nikui",
    "naide-without",
    "nagara-while",
    "node-reason",
    "noni-contrast",
    "toki-time",
    "mae-ni-before",
    "ato-de-after",
    "te-kara-since",
    "made-ni-deadline",
    "you-ni-naru",
    "koto-ni-suru",
    "dake-shika",
]


def _write(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def test_foundation_path_has_thirty_expanded_entries() -> None:
    entries = load_grammar_curriculum(GRAMMAR_DIR)
    foundation = [entry for entry in entries if entry.path == "foundation"]

    assert len(foundation) == 30
    assert [entry.slug for entry in foundation] == EXPECTED_FOUNDATION_SLUGS
    assert [entry.display_order for entry in foundation] == list(range(1, 31))
    assert all(entry.examples and entry.common_mistakes for entry in foundation)
    assert all(1 <= len(entry.related_entries) <= 2 for entry in foundation)


def test_core_path_has_thirty_expanded_entries() -> None:
    entries = load_grammar_curriculum(GRAMMAR_DIR)
    core = [entry for entry in entries if entry.path == "core"]
    curriculum_ids = {entry.id for entry in entries}

    assert len(core) == 30
    assert [entry.slug for entry in core] == EXPECTED_CORE_SLUGS
    assert [entry.display_order for entry in core] == list(range(31, 61))
    assert all(
        urlparse(entry.source_url).scheme == "https"
        and urlparse(entry.source_url).hostname
        in {"guidetojapanese.org", "www.guidetojapanese.org"}
        for entry in core
    )
    assert all(entry.examples and entry.common_mistakes for entry in core)
    assert all(1 <= len(entry.related_entries) <= 2 for entry in core)
    assert all(
        related_id in curriculum_ids
        for entry in core
        for related_id in entry.related_entries
    )


def test_expressions_path_has_thirty_expanded_entries() -> None:
    entries = load_grammar_curriculum(GRAMMAR_DIR)
    expressions = [entry for entry in entries if entry.path == "expressions"]
    curriculum_ids = {entry.id for entry in entries}

    assert len(expressions) == 30
    assert [entry.slug for entry in expressions] == EXPECTED_EXPRESSIONS_SLUGS
    assert [entry.display_order for entry in expressions] == list(range(61, 91))
    assert all(
        urlparse(entry.source_url).scheme == "https"
        and urlparse(entry.source_url).hostname
        in {"guidetojapanese.org", "www.guidetojapanese.org"}
        for entry in expressions
    )
    assert all(entry.examples and entry.common_mistakes for entry in expressions)
    assert all(1 <= len(entry.related_entries) <= 2 for entry in expressions)
    assert all(
        related_id in curriculum_ids
        for entry in expressions
        for related_id in entry.related_entries
    )


def test_core_path_preserves_reviewed_grammar_distinctions() -> None:
    core = {
        entry.slug: entry
        for entry in load_grammar_curriculum(GRAMMAR_DIR)
        if entry.path == "core"
    }

    relative_clauses = core["relative-clauses"]
    relative_guidance = " ".join(
        [
            relative_clauses.connection,
            relative_clauses.explanation_zh,
            *relative_clauses.common_mistakes,
        ]
    )
    assert all(
        distinction in relative_guidance
        for distinction in ("非过去肯定", "な形容词", "名词 + の", "である")
    )
    assert "だ」不能直接放在被修饰名词前" in relative_guidance

    quotation = core["to-quotation"]
    quotation_guidance = " ".join(
        [quotation.connection, quotation.explanation_zh, *quotation.common_mistakes]
    )
    assert all(
        distinction in quotation_guidance
        for distinction in ("直接引用", "原话", "间接引用", "普通形", "名词/な形容词 + だ")
    )
    assert any("です」と" in example.ja for example in quotation.examples)
    assert any("だと" in example.ja for example in quotation.examples)

    assert core["addressing-people"].related_entries == [
        "grammar:tae-kim:polite-masu",
        "grammar:tae-kim:ka-question",
    ]

    morau_guidance = " ".join(
        [core["morau"].explanation_zh, *core["morau"].common_mistakes]
    )
    assert "受益" in morau_guidance
    assert "不一定" in morau_guidance

    explanatory_example = core["explanatory-no-da"].examples[0]
    assert explanatory_example.zh == "电车晚点了(带说明语气)。"


def test_explicit_json_file_is_supported() -> None:
    expected_foundation = [
        entry
        for entry in load_grammar_curriculum(GRAMMAR_DIR)
        if entry.path == "foundation"
    ]
    assert load_grammar_curriculum(FOUNDATION) == expected_foundation


def test_validator_rejects_duplicate_identity_across_files(tmp_path: Path) -> None:
    payload = json.loads(FOUNDATION.read_text(encoding="utf-8"))
    duplicate = dict(payload[0], path="core")
    _write(tmp_path / "tae-kim-foundation.zh.json", [payload[0]])
    _write(tmp_path / "tae-kim-core.zh.json", [duplicate])

    with pytest.raises(ValueError, match="IDs must be unique"):
        load_grammar_curriculum(tmp_path)


def test_validator_sorts_then_requires_global_sequential_order(tmp_path: Path) -> None:
    payload = json.loads(FOUNDATION.read_text(encoding="utf-8"))
    payload[0]["related_entries"] = []
    payload[1]["related_entries"] = []
    _write(tmp_path / "tae-kim-foundation.zh.json", [payload[1], payload[0]])
    assert [entry.display_order for entry in load_grammar_curriculum(tmp_path)] == [1, 2]

    payload[1]["display_order"] = 3
    _write(tmp_path / "tae-kim-foundation.zh.json", payload[:2])
    with pytest.raises(ValueError, match="display_order must be sequential"):
        load_grammar_curriculum(tmp_path)


def test_validator_requires_each_named_file_path_to_be_represented(tmp_path: Path) -> None:
    payload = json.loads(FOUNDATION.read_text(encoding="utf-8"))
    _write(tmp_path / "tae-kim-foundation.zh.json", payload)
    _write(tmp_path / "tae-kim-core.zh.json", [])

    with pytest.raises(ValueError, match="expected path.*core"):
        load_grammar_curriculum(tmp_path)


def test_validator_rejects_non_path_curriculum_filename(tmp_path: Path) -> None:
    payload = json.loads(FOUNDATION.read_text(encoding="utf-8"))
    _write(tmp_path / "tae-kim-basic.zh.json", payload)

    with pytest.raises(ValueError, match="must name a curriculum path"):
        load_grammar_curriculum(tmp_path)


def test_validator_rejects_entries_stored_under_the_wrong_named_path(
    tmp_path: Path,
) -> None:
    payload = json.loads(FOUNDATION.read_text(encoding="utf-8"))
    foundation_entry = dict(payload[0], display_order=2, related_entries=[])
    core_entry = dict(payload[1], path="core", display_order=1, related_entries=[])
    _write(tmp_path / "tae-kim-foundation.zh.json", [core_entry])
    _write(tmp_path / "tae-kim-core.zh.json", [foundation_entry])

    with pytest.raises(ValueError, match=r"must contain only (core|foundation) entries"):
        load_grammar_curriculum(tmp_path)


def test_validator_rejects_related_id_missing_from_curriculum(tmp_path: Path) -> None:
    payload = json.loads(FOUNDATION.read_text(encoding="utf-8"))
    payload[0]["related_entries"] = ["grammar:tae-kim:not-in-curriculum"]
    _write(tmp_path / "tae-kim-foundation.zh.json", payload)

    with pytest.raises(ValueError, match="related entry.*not-in-curriculum"):
        load_grammar_curriculum(tmp_path)
