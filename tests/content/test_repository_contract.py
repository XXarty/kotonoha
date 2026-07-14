from pathlib import Path


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
