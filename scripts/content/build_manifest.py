from __future__ import annotations

from datetime import datetime

from scripts.content.models import BuildManifest, ContentSource, SourceSnapshot


def build_manifest(
    *,
    sources: list[ContentSource],
    snapshots: list[SourceSnapshot],
    counts: dict[str, int],
    rejection_counts: dict[str, int],
    files: dict[str, str],
    built_at: datetime,
    generator_version: str = "2",
) -> BuildManifest:
    return BuildManifest(
        built_at=built_at,
        generator_version=generator_version,
        sources=sources,
        snapshots=snapshots,
        counts=counts,
        rejection_counts=rejection_counts,
        files=files,
    )
