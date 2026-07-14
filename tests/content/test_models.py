from __future__ import annotations

import pytest
from pydantic import ValidationError

from scripts.content.models import (
    GrammarRecord,
    KanaRecord,
    RawVocabularyRecord,
    VocabularyRecord,
    grammar_source_key,
    kana_source_key,
    vocabulary_source_key,
)


def vocabulary_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "source_slug": "dk-visual-dictionary-2011",
        "source_key": "p012-i003",
        "category": "people",
        "list_name": "the body",
        "japanese": "頭",
        "kana": "あたま",
        "romaji": "atama",
        "meaning_en": "head",
        "meaning_zh": "头",
        "source_page": 12,
        "confidence": 0.95,
        "validation_status": "published",
    }
    payload.update(overrides)
    return payload


@pytest.mark.parametrize(
    "field,value",
    [
        ("source_key", ""),
        ("japanese", " "),
        ("kana", ""),
        ("romaji", ""),
        ("meaning_en", ""),
        ("source_page", 0),
        ("validation_status", "draft"),
    ],
)
def test_raw_vocabulary_rejects_invalid_required_values(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        RawVocabularyRecord.model_validate(vocabulary_payload(**{field: value}))


def test_raw_vocabulary_allows_missing_chinese_but_final_record_does_not() -> None:
    raw = RawVocabularyRecord.model_validate(vocabulary_payload(meaning_zh=""))
    assert raw.meaning_zh == ""
    with pytest.raises(ValidationError):
        VocabularyRecord.model_validate(raw.model_dump())


def test_grammar_and_kana_reject_blank_required_values() -> None:
    with pytest.raises(ValidationError):
        GrammarRecord(
            source_slug="teikyo-beginner-grammar",
            source_key="n001",
            source_number=1,
            pattern=" ",
            explanation_zh="是",
            example_jp="私は学生です。",
            source_page=2,
            confidence=0.95,
            validation_status="needs_review",
        )
    with pytest.raises(ValidationError):
        KanaRecord(
            source_slug="canonical-kana",
            list_name="gojuon",
            source_key="a:a",
            hiragana="あ",
            katakana="ア",
            romaji="",
            row_group="a",
            validation_status="published",
        )


def test_source_keys_are_deterministic_and_content_independent() -> None:
    assert vocabulary_source_key(source_page=12, page_ordinal=3) == "p012-i003"
    assert grammar_source_key(228) == "n228"
    assert kana_source_key(" K 行 ", "KI") == "k行:ki"
