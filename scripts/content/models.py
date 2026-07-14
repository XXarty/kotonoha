from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime
from typing import Annotated, Literal
from urllib.parse import urlparse

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)


NonBlankText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Sha256 = Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{64}$")]


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).split())


def _slug(value: str) -> str:
    normalized = normalize_text(value).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    if not slug:
        raise ValueError("value must contain ASCII letters or digits")
    return slug


def vocabulary_id(jmdict_id: str) -> str:
    normalized = normalize_text(jmdict_id)
    if not normalized.isascii() or not normalized.isdigit():
        raise ValueError("JMdict ID must contain only ASCII digits")
    return f"vocabulary:jmdict:{normalized}"


def grammar_id(slug: str) -> str:
    return f"grammar:tae-kim:{_slug(slug)}"


def kana_id(romaji: str) -> str:
    return f"kana:gojuon:{_slug(romaji)}"


def _require_https(value: str) -> str:
    normalized = normalize_text(value)
    parsed = urlparse(normalized)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("URL must use HTTPS")
    return normalized


class ContentRecord(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @field_validator("*", mode="before")
    @classmethod
    def normalize_scalar_strings(cls, value: object) -> object:
        return normalize_text(value) if isinstance(value, str) else value


class ExampleRecord(ContentRecord):
    ja: NonBlankText
    zh: NonBlankText
    source: Literal["tae-kim", "kotonoha-original"]


class VocabularyRecord(ContentRecord):
    kind: Literal["vocabulary"] = "vocabulary"
    id: str = Field(pattern=r"^vocabulary:jmdict:[0-9]+$")
    source_id: Literal["jmdict-kaikki"]
    source_key: str = Field(pattern=r"^jmdict:[0-9]+$")
    category: Literal["nouns", "verbs", "adjectives", "other"]
    list_name: NonBlankText
    japanese: NonBlankText
    kana: NonBlankText
    romaji: NonBlankText
    part_of_speech: list[NonBlankText] = Field(min_length=1)
    meaning_zh: list[NonBlankText] = Field(min_length=1)
    meaning_en: list[NonBlankText] = Field(min_length=1)
    meaning_zh_source: Literal["kaikki-zhwiktionary"]
    tier: Literal["core", "extended"]
    priority_tags: list[NonBlankText] = Field(default_factory=list)
    examples: list[ExampleRecord] = Field(default_factory=list)
    content_version: NonBlankText
    published: Literal[True]

    @model_validator(mode="after")
    def validate_identity(self) -> VocabularyRecord:
        upstream_id = self.source_key.removeprefix("jmdict:")
        if self.id != vocabulary_id(upstream_id):
            raise ValueError("vocabulary ID must match source_key")
        return self


class GrammarRecord(ContentRecord):
    kind: Literal["grammar"] = "grammar"
    id: str = Field(pattern=r"^grammar:tae-kim:[a-z0-9-]+$")
    provenance_kind: Literal["direct-source", "project-authored-extension"] = (
        "direct-source"
    )
    source_id: Literal["tae-kim-grammar", "kotonoha-original"]
    source_key: str = Field(pattern=r"^tae-kim:[a-z0-9-]+$")
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    category: NonBlankText
    list_name: NonBlankText
    expression: NonBlankText
    connection: NonBlankText
    explanation_zh: NonBlankText
    path: Literal["foundation", "core", "expressions", "advanced"]
    examples: list[ExampleRecord] = Field(min_length=1)
    common_mistakes: list[NonBlankText] = Field(min_length=1)
    related_entries: list[str] = Field(default_factory=list)
    source_url: str
    curriculum_context_url: str | None = None
    provenance_note: NonBlankText | None = None
    license_key: Literal["cc-by-nc-sa-3.0", "all-rights-reserved"]
    content_version: NonBlankText
    display_order: int = Field(gt=0)
    published: Literal[True]

    @field_validator("source_url", "curriculum_context_url")
    @classmethod
    def validate_provenance_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = _require_https(value)
        return value

    @field_validator("related_entries")
    @classmethod
    def validate_related_entries(cls, value: list[str]) -> list[str]:
        pattern = re.compile(r"^grammar:tae-kim:[a-z0-9-]+$")
        if any(pattern.fullmatch(related_id) is None for related_id in value):
            raise ValueError("related entries must use stable Tae Kim grammar IDs")
        if len(set(value)) != len(value):
            raise ValueError("related entries must not contain duplicates")
        return value

    @model_validator(mode="after")
    def validate_identity(self) -> GrammarRecord:
        expected = grammar_id(self.slug)
        if self.id != expected or self.source_key != f"tae-kim:{self.slug}":
            raise ValueError("grammar identity fields must match slug")
        if self.id in self.related_entries:
            raise ValueError("grammar entry cannot relate to itself")
        if self.provenance_kind == "direct-source":
            hostname = (urlparse(self.source_url).hostname or "").lower()
            if self.source_id != "tae-kim-grammar":
                raise ValueError("direct grammar must use the Tae Kim source ID")
            if self.license_key != "cc-by-nc-sa-3.0":
                raise ValueError(
                    "direct grammar must use the CC BY-NC-SA 3.0 license"
                )
            if hostname not in {"guidetojapanese.org", "www.guidetojapanese.org"}:
                raise ValueError("direct grammar source URL must use guidetojapanese.org")
            if self.curriculum_context_url is not None or self.provenance_note is not None:
                raise ValueError(
                    "direct grammar must not publish extension provenance fields"
                )
        else:
            if self.source_id != "kotonoha-original":
                raise ValueError("grammar extensions must use the KOTONOHA source ID")
            if self.source_url != "https://github.com/XXarty/kotonoha":
                raise ValueError("grammar extensions must use the KOTONOHA source URL")
            if self.license_key != "all-rights-reserved":
                raise ValueError("grammar extensions must be all rights reserved")
            if self.provenance_note is None:
                raise ValueError("grammar extensions require a provenance note")
            if self.curriculum_context_url is not None:
                hostname = (
                    urlparse(self.curriculum_context_url).hostname or ""
                ).lower()
                if hostname not in {
                    "guidetojapanese.org",
                    "www.guidetojapanese.org",
                }:
                    raise ValueError(
                        "grammar curriculum context URL must use guidetojapanese.org"
                    )
        return self


class KanaRecord(ContentRecord):
    kind: Literal["kana"] = "kana"
    id: str = Field(pattern=r"^kana:gojuon:[a-z]+$")
    source_id: Literal["kotonoha-kana"]
    hiragana: NonBlankText
    katakana: NonBlankText
    romaji: str = Field(pattern=r"^[a-z]+$")
    row_group: NonBlankText
    display_order: int = Field(gt=0)
    published: Literal[True]

    @model_validator(mode="after")
    def validate_identity(self) -> KanaRecord:
        if self.id != kana_id(self.romaji):
            raise ValueError("kana ID must match romaji")
        return self


class ContentSource(ContentRecord):
    id: str = Field(pattern=r"^[a-z0-9-]+$")
    title: NonBlankText
    url: str
    license_name: NonBlankText
    license_url: str
    enabled: bool

    @field_validator("url", "license_url")
    @classmethod
    def validate_https_url(cls, value: str) -> str:
        return _require_https(value)


class SourceSnapshot(ContentRecord):
    source_id: str = Field(pattern=r"^[a-z0-9-]+$")
    snapshot_date: date
    downloaded_at: datetime
    sha256: Sha256
    artifact_name: NonBlankText | None = None
    asset_url: str | None = None
    repository_path: NonBlankText | None = None

    @field_validator("asset_url")
    @classmethod
    def validate_asset_url(cls, value: str | None) -> str | None:
        return _require_https(value) if value is not None else None

    @field_validator("repository_path")
    @classmethod
    def validate_repository_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value.startswith("/") or ".." in value.split("/"):
            raise ValueError("repository path must be relative and stay inside the repository")
        return value

    @model_validator(mode="after")
    def validate_provenance_location(self) -> SourceSnapshot:
        has_artifact_name = self.artifact_name is not None
        has_asset_url = self.asset_url is not None
        if has_artifact_name != has_asset_url:
            raise ValueError("remote snapshot requires artifact_name and asset_url together")
        has_remote = has_artifact_name and has_asset_url
        has_local = self.repository_path is not None
        if has_remote == has_local:
            raise ValueError(
                "snapshot requires exactly one provenance location: remote asset or repository path"
            )
        return self


class BuildManifest(ContentRecord):
    manifest_version: Literal[2] = 2
    built_at: datetime
    generator_version: NonBlankText
    sources: list[ContentSource] = Field(min_length=1)
    snapshots: list[SourceSnapshot] = Field(min_length=1)
    counts: dict[NonBlankText, int]
    rejection_counts: dict[NonBlankText, int]
    files: dict[NonBlankText, Sha256]

    @field_validator("counts", "rejection_counts")
    @classmethod
    def validate_nonnegative_counts(cls, value: dict[str, int]) -> dict[str, int]:
        if any(count < 0 for count in value.values()):
            raise ValueError("manifest counts must be nonnegative")
        return value
