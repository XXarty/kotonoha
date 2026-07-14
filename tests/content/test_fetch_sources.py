from __future__ import annotations

from pathlib import Path

import pytest

import scripts.content.fetch_sources as fetch_sources
from scripts.content.fetch_sources import download_source, sha256_file


def test_downloader_rejects_unknown_host(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="not allowlisted"):
        download_source("https://example.com/data.json", tmp_path / "data.json")


def test_download_is_atomic_and_rejects_hash_mismatch(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    destination = tmp_path / "jmdict.json"
    monkeypatch.setattr(fetch_sources, "stream_url", lambda _url: iter([b"wrong"]))

    with pytest.raises(ValueError, match="SHA-256 mismatch"):
        download_source(
            "https://github.com/scriptin/jmdict-simplified/releases/download/test/jmdict.json",
            destination,
            expected_sha256="0" * 64,
        )

    assert not destination.exists()
    assert not destination.with_suffix(".json.part").exists()


def test_download_returns_verified_hash(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    destination = tmp_path / "kaikki.jsonl"
    monkeypatch.setattr(fetch_sources, "stream_url", lambda _url: iter([b"public", b" data"]))

    digest = download_source(
        "https://kaikki.org/dictionary/Chinese/kaikki.jsonl",
        destination,
    )

    assert digest == sha256_file(destination)
    assert destination.read_bytes() == b"public data"
