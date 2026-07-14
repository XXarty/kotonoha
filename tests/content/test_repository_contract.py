import json
from pathlib import Path

from scripts.content.validate_grammar import load_grammar_curriculum


ROOT = Path(__file__).resolve().parents[2]


def test_retired_content_modules_do_not_exist() -> None:
    retired = {
        "extract_dk.py",
        "extract_grammar.py",
        "translate_zh.py",
        "import_to_neon.py",
    }
    present = {path.name for path in (ROOT / "scripts/content").glob("*.py")}

    assert retired.isdisjoint(present)


def test_content_scripts_do_not_import_pdf_or_ocr_packages() -> None:
    forbidden = ("pypdf", "pdfplumber", "pytesseract", "pdf2image")
    imports = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (ROOT / "scripts/content").glob("*.py")
    ).lower()

    assert not [package for package in forbidden if package in imports]


def test_published_source_catalog_covers_every_grammar_source() -> None:
    curriculum = load_grammar_curriculum(ROOT / "data/content/grammar")
    payload = json.loads(
        (ROOT / "webapp/src/content/generated/sources.json").read_text(
            encoding="utf-8"
        )
    )
    sources = {source["id"]: source for source in payload["sources"]}

    assert {entry.source_id for entry in curriculum} <= sources.keys()
    assert sources["tae-kim-grammar"]["license_name"] == "CC BY-SA 3.0"
    assert sources["kotonoha-original"] == {
        "enabled": True,
        "id": "kotonoha-original",
        "license_name": "All rights reserved",
        "license_url": "https://github.com/XXarty/kotonoha",
        "title": "KOTONOHA 原创语法扩展",
        "url": "https://github.com/XXarty/kotonoha",
    }
