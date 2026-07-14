from __future__ import annotations

from datetime import datetime, timezone

import pytest

from scripts.content.build_manifest import build_manifest
from scripts.content.models import ContentSource, SourceSnapshot


def test_manifest_calculates_counts_and_rejects_negative_values() -> None:
    source = ContentSource(
        id="kotonoha-kana",
        title="KOTONOHA 基础五十音",
        url="https://github.com/example/kotonoha",
        license_name="CC0 1.0",
        license_url="https://creativecommons.org/publicdomain/zero/1.0/",
        enabled=True,
    )
    snapshot = SourceSnapshot(
        source_id=source.id,
        snapshot_date="2026-07-14",
        downloaded_at=datetime(2026, 7, 14, tzinfo=timezone.utc),
        sha256="a" * 64,
    )

    manifest = build_manifest(
        sources=[source],
        snapshots=[snapshot],
        counts={"vocabulary": 500, "grammar": 30, "kana": 46, "invalid": 0},
        rejection_counts={"missing_chinese": 10},
        files={"vocabulary.json": "b" * 64},
        built_at=datetime(2026, 7, 14, tzinfo=timezone.utc),
    )

    assert manifest.manifest_version == 2
    with pytest.raises(ValueError):
        build_manifest(
            sources=[source],
            snapshots=[snapshot],
            counts={"vocabulary": -1},
            rejection_counts={},
            files={},
            built_at=datetime(2026, 7, 14, tzinfo=timezone.utc),
        )
