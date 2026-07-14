from __future__ import annotations

from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from scripts.content.models import (
    BuildManifest,
    ContentSource,
    GrammarRecord,
    KanaRecord,
    SourceSnapshot,
    VocabularyRecord,
    grammar_id,
    kana_id,
    normalize_text,
    vocabulary_id,
)


def vocabulary_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "id": "vocabulary:jmdict:1000001",
        "source_id": "jmdict-kaikki",
        "source_key": "jmdict:1000001",
        "category": "verbs",
        "list_name": "common-verbs",
        "japanese": "食べる",
        "kana": "たべる",
        "romaji": "taberu",
        "part_of_speech": ["verb"],
        "meaning_zh": ["吃"],
        "meaning_en": ["to eat"],
        "meaning_zh_source": "kaikki-zhwiktionary",
        "content_version": "2026-07-13",
        "published": True,
    }
    payload.update(overrides)
    return payload


def test_vocabulary_has_stable_string_id_and_complete_provenance() -> None:
    record = VocabularyRecord.model_validate(vocabulary_payload())

    assert record.id == "vocabulary:jmdict:1000001"
    assert record.meaning_zh_source == "kaikki-zhwiktionary"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("id", "1000001"),
        ("japanese", " "),
        ("kana", ""),
        ("part_of_speech", []),
        ("meaning_zh", []),
        ("meaning_zh", [" "]),
        ("meaning_en", []),
        ("published", False),
    ],
)
def test_vocabulary_rejects_unpublishable_values(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        VocabularyRecord.model_validate(vocabulary_payload(**{field: value}))


def test_grammar_requires_official_source_and_noncommercial_license() -> None:
    record = GrammarRecord(
        id="grammar:tae-kim:te-form",
        source_id="tae-kim-grammar",
        source_key="tae-kim:te-form",
        slug="te-form",
        category="verbs",
        list_name="verb-basics",
        expression="て形",
        connection="动词变为て形",
        explanation_zh="连接动作或构成其他表达。",
        example_ja="朝ご飯を食べて、学校へ行く。",
        example_zh="吃完早饭去学校。",
        source_url="https://guidetojapanese.org/learn/grammar/teform",
        example_source="kotonoha-original",
        license_key="cc-by-nc-sa-3.0",
        content_version="2026-07-14",
        display_order=11,
        published=True,
    )

    assert record.slug == "te-form"
    with pytest.raises(ValidationError):
        GrammarRecord.model_validate(
            {**record.model_dump(), "source_url": "https://example.com/grammar"}
        )


def test_kana_uses_project_stable_identity() -> None:
    record = KanaRecord(
        id="kana:gojuon:a",
        source_id="kotonoha-kana",
        hiragana="あ",
        katakana="ア",
        romaji="a",
        row_group="a",
        display_order=1,
        published=True,
    )

    assert record.id == "kana:gojuon:a"


def test_sources_and_manifest_require_valid_hashes_and_counts() -> None:
    source = ContentSource(
        id="jmdict-kaikki",
        title="JMdict + Kaikki 中文维基词典",
        url="https://www.edrdg.org/jmdict/edict.html",
        license_name="CC BY-SA 4.0",
        license_url="https://creativecommons.org/licenses/by-sa/4.0/",
        enabled=True,
    )
    snapshot = SourceSnapshot(
        source_id=source.id,
        snapshot_date=date(2026, 7, 13),
        downloaded_at=datetime(2026, 7, 14, tzinfo=timezone.utc),
        sha256="a" * 64,
    )
    manifest = BuildManifest(
        built_at=datetime(2026, 7, 14, tzinfo=timezone.utc),
        generator_version="2",
        sources=[source],
        snapshots=[snapshot],
        counts={"vocabulary": 500, "grammar": 30, "kana": 46, "invalid": 0},
        rejection_counts={"missing_chinese": 12},
        files={"vocabulary.json": "b" * 64},
    )

    assert manifest.manifest_version == 2
    with pytest.raises(ValidationError):
        SourceSnapshot.model_validate({**snapshot.model_dump(), "sha256": "bad"})


def test_normalization_and_ids_are_deterministic() -> None:
    assert normalize_text("  ＴＡＢＥＲＵ　") == "TABERU"
    assert vocabulary_id("1000001") == "vocabulary:jmdict:1000001"
    assert grammar_id(" Te Form ") == "grammar:tae-kim:te-form"
    assert kana_id("SHI") == "kana:gojuon:shi"

    with pytest.raises(ValueError):
        vocabulary_id("abc")
