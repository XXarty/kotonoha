from __future__ import annotations

import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


ValidationStatus = Literal["needs_review", "published"]


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).split())


def vocabulary_source_key(*, source_page: int, page_ordinal: int) -> str:
    if source_page < 1 or page_ordinal < 1:
        raise ValueError("source_page and page_ordinal must be positive")
    return f"p{source_page:03d}-i{page_ordinal:03d}"


def grammar_source_key(source_number: int) -> str:
    if not 1 <= source_number <= 228:
        raise ValueError("source_number must be between 1 and 228")
    return f"n{source_number:03d}"


def kana_source_key(row_group: str, romaji: str) -> str:
    group = normalize_text(row_group).lower().replace(" ", "")
    canonical_romaji = normalize_text(romaji).lower().replace(" ", "")
    if not group or not canonical_romaji:
        raise ValueError("row_group and romaji must not be blank")
    return f"{group}:{canonical_romaji}"


class ContentRecord(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("*", mode="before")
    @classmethod
    def normalize_strings(cls, value: object) -> object:
        return normalize_text(value) if isinstance(value, str) else value


class RawVocabularyRecord(ContentRecord):
    source_slug: str = Field(min_length=1)
    source_key: str = Field(min_length=1)
    category: str = Field(min_length=1)
    list_name: str = Field(min_length=1)
    japanese: str = Field(min_length=1)
    kana: str = Field(min_length=1)
    romaji: str = Field(min_length=1)
    meaning_en: str = Field(min_length=1)
    meaning_zh: str = ""
    source_page: int = Field(gt=0)
    confidence: float = Field(ge=0, le=1)
    validation_status: ValidationStatus
    translation_provenance: Literal["manual", "machine_translated"] | None = None


class VocabularyRecord(RawVocabularyRecord):
    meaning_zh: str = Field(min_length=1)


class GrammarRecord(ContentRecord):
    source_slug: str = Field(min_length=1)
    source_key: str = Field(min_length=1)
    source_number: int = Field(ge=1, le=228)
    pattern: str = Field(min_length=1)
    explanation_zh: str = Field(min_length=1)
    example_jp: str = Field(min_length=1)
    example_zh: str = ""
    connection: str = ""
    source_page: int = Field(gt=0)
    confidence: float = Field(ge=0, le=1)
    validation_status: ValidationStatus


class KanaRecord(ContentRecord):
    source_slug: str = Field(min_length=1)
    list_name: str = Field(min_length=1)
    source_key: str = Field(min_length=1)
    hiragana: str = Field(min_length=1)
    katakana: str = Field(min_length=1)
    romaji: str = Field(min_length=1)
    row_group: str = Field(min_length=1)
    validation_status: ValidationStatus
