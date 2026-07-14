from __future__ import annotations

from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from scripts.content.models import (
    BuildManifest,
    ContentSource,
    ExampleRecord,
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
        "tier": "core",
        "priority_tags": [],
        "examples": [],
        "content_version": "2026-07-13",
        "published": True,
    }
    payload.update(overrides)
    return payload


def test_vocabulary_has_stable_string_id_and_complete_provenance() -> None:
    record = VocabularyRecord.model_validate(vocabulary_payload())

    assert record.id == "vocabulary:jmdict:1000001"
    assert record.meaning_zh_source == "kaikki-zhwiktionary"


def test_vocabulary_supports_tier_priority_and_optional_examples() -> None:
    record = VocabularyRecord.model_validate(
        vocabulary_payload(
            tier="core",
            priority_tags=["common"],
            examples=[
                {
                    "ja": "灯をつける。",
                    "zh": "开灯。",
                    "source": "kotonoha-original",
                }
            ],
        )
    )

    assert record.tier == "core"
    assert record.priority_tags == ["common"]
    assert record.examples[0].ja == "灯をつける。"


def test_example_record_rejects_blank_text_and_unknown_provenance() -> None:
    with pytest.raises(ValidationError):
        ExampleRecord(ja=" ", zh="开灯。", source="kotonoha-original")
    with pytest.raises(ValidationError):
        ExampleRecord(ja="灯をつける。", zh="开灯。", source="unknown")


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


def grammar_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "id": "grammar:tae-kim:te-form",
        "source_id": "tae-kim-grammar",
        "source_key": "tae-kim:te-form",
        "slug": "te-form",
        "category": "verbs",
        "list_name": "verb-basics",
        "expression": "て形",
        "connection": "动词变为て形",
        "explanation_zh": "连接动作或构成其他表达。",
        "path": "core",
        "examples": [
            {
                "ja": "朝ご飯を食べて、学校へ行く。",
                "zh": "吃完早饭去学校。",
                "source": "kotonoha-original",
            }
        ],
        "common_mistakes": ["前后动作的先后关系需要结合语境判断。"],
        "related_entries": ["grammar:tae-kim:verb-basics"],
        "source_url": "https://guidetojapanese.org/learn/grammar/teform",
        "license_key": "cc-by-sa-3.0",
        "content_version": "2026-07-14",
        "display_order": 11,
        "published": True,
    }
    payload.update(overrides)
    return payload


def test_direct_grammar_defaults_and_serializes_published_provenance() -> None:
    record = GrammarRecord.model_validate(grammar_payload())

    assert record.slug == "te-form"
    assert record.provenance_kind == "direct-source"
    assert record.model_dump()["provenance_kind"] == "direct-source"
    assert record.source_id == "tae-kim-grammar"
    assert record.license_key == "cc-by-sa-3.0"
    with pytest.raises(ValidationError):
        GrammarRecord.model_validate(
            {**record.model_dump(), "source_url": "https://example.com/grammar"}
        )


def test_project_authored_grammar_extension_preserves_context_and_note() -> None:
    record = GrammarRecord.model_validate(
        grammar_payload(
            provenance_kind="project-authored-extension",
            source_id="kotonoha-original",
            source_url="https://github.com/XXarty/kotonoha",
            license_key="all-rights-reserved",
            curriculum_context_url="https://guidetojapanese.org/learn/grammar/other",
            provenance_note=(
                "本条的中文说明与例句为 KOTONOHA 原创；课程语境链接仅用于定位相关学习背景，"
                "并非本语法点的直接课程。"
            ),
        )
    )

    assert record.provenance_kind == "project-authored-extension"
    assert record.curriculum_context_url == (
        "https://guidetojapanese.org/learn/grammar/other"
    )
    assert "KOTONOHA 原创" in record.provenance_note


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("source_id", "kotonoha-original"),
        ("source_url", "https://github.com/XXarty/kotonoha"),
        ("license_key", "all-rights-reserved"),
        ("curriculum_context_url", "https://guidetojapanese.org/learn/grammar/other"),
    ],
)
def test_direct_grammar_rejects_extension_provenance_fields(
    field: str, value: object
) -> None:
    with pytest.raises(ValidationError):
        GrammarRecord.model_validate(grammar_payload(**{field: value}))


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("source_id", "tae-kim-grammar"),
        ("source_url", "https://guidetojapanese.org/learn/grammar/other"),
        ("license_key", "cc-by-sa-3.0"),
        ("provenance_note", " "),
        ("curriculum_context_url", "https://example.com/context"),
    ],
)
def test_grammar_extension_rejects_mismatched_provenance(
    field: str, value: object
) -> None:
    payload = grammar_payload(
        provenance_kind="project-authored-extension",
        source_id="kotonoha-original",
        source_url="https://github.com/XXarty/kotonoha",
        license_key="all-rights-reserved",
        curriculum_context_url="https://guidetojapanese.org/learn/grammar/other",
        provenance_note=(
            "本条的中文说明与例句为 KOTONOHA 原创；课程语境链接仅用于定位相关学习背景，"
            "并非本语法点的直接课程。"
        ),
    )
    payload[field] = value

    with pytest.raises(ValidationError):
        GrammarRecord.model_validate(payload)


def test_grammar_requires_path_examples_mistakes_and_valid_related_ids() -> None:
    record = GrammarRecord.model_validate(
        grammar_payload(
            path="foundation",
            examples=[
                {
                    "ja": "私は学生です。",
                    "zh": "我是学生。",
                    "source": "kotonoha-original",
                }
            ],
            common_mistakes=["名词普通形不能直接省略判断形式。"],
            related_entries=["grammar:tae-kim:wa-topic"],
        )
    )

    assert record.path == "foundation"
    assert record.examples[0].zh == "我是学生。"


@pytest.mark.parametrize(
    "related_entries",
    [
        ["grammar:tae-kim:te-form"],
        ["grammar:tae-kim:verb-basics", "grammar:tae-kim:verb-basics"],
        ["vocabulary:jmdict:1000001"],
        ["grammar:tae-kim:Uppercase"],
    ],
)
def test_grammar_rejects_invalid_related_entries(related_entries: list[str]) -> None:
    with pytest.raises(ValidationError):
        GrammarRecord.model_validate(grammar_payload(related_entries=related_entries))


def test_grammar_rejects_legacy_scalar_example_fields() -> None:
    payload = grammar_payload()
    payload.update(
        example_ja="朝ご飯を食べて、学校へ行く。",
        example_zh="吃完早饭去学校。",
        example_source="kotonoha-original",
    )

    with pytest.raises(ValidationError):
        GrammarRecord.model_validate(payload)


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
