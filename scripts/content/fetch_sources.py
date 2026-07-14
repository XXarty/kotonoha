from __future__ import annotations

import argparse
import hashlib
import json
import urllib.request
from collections.abc import Iterator
from pathlib import Path
from urllib.parse import urlparse


ALLOWED_HOSTS = {
    "github.com",
    "objects.githubusercontent.com",
    "kaikki.org",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stream_url(url: str, chunk_size: int = 1024 * 1024) -> Iterator[bytes]:
    request = urllib.request.Request(url, headers={"User-Agent": "KOTONOHA-content-builder/1"})
    with urllib.request.urlopen(request) as response:
        while chunk := response.read(chunk_size):
            yield chunk


def download_source(
    url: str,
    destination: Path,
    expected_sha256: str | None = None,
) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError(f"source host is not allowlisted: {parsed.hostname or url}")
    if expected_sha256 is not None and len(expected_sha256) != 64:
        raise ValueError("expected SHA-256 must contain 64 hexadecimal characters")

    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + ".part")
    digest = hashlib.sha256()
    try:
        with partial.open("wb") as handle:
            for chunk in stream_url(url):
                handle.write(chunk)
                digest.update(chunk)
        actual_sha256 = digest.hexdigest()
        if expected_sha256 is not None and actual_sha256 != expected_sha256.lower():
            raise ValueError(
                f"SHA-256 mismatch: expected {expected_sha256.lower()}, got {actual_sha256}"
            )
        partial.replace(destination)
        return actual_sha256
    except BaseException:
        partial.unlink(missing_ok=True)
        raise


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download one allowlisted public source atomically.")
    parser.add_argument("--url", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--expected-sha256")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    digest = download_source(args.url, args.output, args.expected_sha256)
    print(json.dumps({"output": str(args.output), "sha256": digest}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
