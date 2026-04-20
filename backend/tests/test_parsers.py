"""
Learnify AI — Parser Unit Tests.

Tests each parser (pdf, ppt, txt) against sample fixture files.
All tests validate that:
  - The parser returns a non-empty list of dicts.
  - Each dict contains the required keys.
  - The ``text`` field is non-empty.

Sample fixture files are created by ``tests/create_fixtures.py``.
Run that script once before running these tests if the fixtures directory
does not yet exist.

Usage (from /backend):
    pytest tests/test_parsers.py -v
"""

import sys
from pathlib import Path

import pytest

# Add /backend to sys.path so imports resolve without package installation
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

FIXTURES_DIR = Path(__file__).parent / "fixtures"

# ── Fixtures bootstrap ────────────────────────────────────────────────────


def _ensure_fixtures() -> None:
    """Create fixture files if they don't already exist."""
    if not FIXTURES_DIR.exists() or not any(FIXTURES_DIR.iterdir()):
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "create_fixtures",
            Path(__file__).parent / "create_fixtures.py",
        )
        module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        spec.loader.exec_module(module)  # type: ignore[union-attr]
        module.create_sample_pdf()
        module.create_sample_pptx()
        module.create_sample_txt()


_ensure_fixtures()


# ── PDF Parser Tests ──────────────────────────────────────────────────────


class TestPdfParser:
    """Unit tests for parsers.pdf_parser.parse_pdf."""

    def test_returns_list(self) -> None:
        """parse_pdf must return a list."""
        from parsers.pdf_parser import parse_pdf

        result = parse_pdf(str(FIXTURES_DIR / "sample.pdf"))
        assert isinstance(result, list), "parse_pdf should return a list"

    def test_non_empty(self) -> None:
        """parse_pdf must return at least one item for a non-empty PDF."""
        from parsers.pdf_parser import parse_pdf

        result = parse_pdf(str(FIXTURES_DIR / "sample.pdf"))
        assert len(result) > 0, "parse_pdf returned an empty list"

    def test_required_keys(self) -> None:
        """Every item must have 'text', 'page', and 'source_file' keys."""
        from parsers.pdf_parser import parse_pdf

        result = parse_pdf(str(FIXTURES_DIR / "sample.pdf"))
        for item in result:
            assert "text" in item, f"Missing 'text' key in: {item}"
            assert "page" in item, f"Missing 'page' key in: {item}"
            assert "source_file" in item, f"Missing 'source_file' key in: {item}"

    def test_text_non_empty(self) -> None:
        """The 'text' field of every item must be a non-empty string."""
        from parsers.pdf_parser import parse_pdf

        result = parse_pdf(str(FIXTURES_DIR / "sample.pdf"))
        for item in result:
            assert isinstance(item["text"], str), "'text' must be a string"
            assert item["text"].strip(), f"'text' is empty in item: {item}"

    def test_page_is_integer(self) -> None:
        """The 'page' field must be a positive integer."""
        from parsers.pdf_parser import parse_pdf

        result = parse_pdf(str(FIXTURES_DIR / "sample.pdf"))
        for item in result:
            assert isinstance(item["page"], int), f"'page' must be int, got: {type(item['page'])}"
            assert item["page"] >= 1, f"'page' must be >= 1, got: {item['page']}"

    def test_source_file_is_filename(self) -> None:
        """The 'source_file' must be only the filename, not the full path."""
        from parsers.pdf_parser import parse_pdf

        result = parse_pdf(str(FIXTURES_DIR / "sample.pdf"))
        for item in result:
            assert item["source_file"] == "sample.pdf", (
                f"Expected 'sample.pdf', got '{item['source_file']}'"
            )


# ── PPT Parser Tests ──────────────────────────────────────────────────────


class TestPptParser:
    """Unit tests for parsers.ppt_parser.parse_ppt."""

    def test_returns_list(self) -> None:
        """parse_ppt must return a list."""
        from parsers.ppt_parser import parse_ppt

        result = parse_ppt(str(FIXTURES_DIR / "sample.pptx"))
        assert isinstance(result, list), "parse_ppt should return a list"

    def test_non_empty(self) -> None:
        """parse_ppt must return at least one item for a non-empty PPTX."""
        from parsers.ppt_parser import parse_ppt

        result = parse_ppt(str(FIXTURES_DIR / "sample.pptx"))
        assert len(result) > 0, "parse_ppt returned an empty list"

    def test_required_keys(self) -> None:
        """Every item must have 'text', 'slide', and 'source_file' keys."""
        from parsers.ppt_parser import parse_ppt

        result = parse_ppt(str(FIXTURES_DIR / "sample.pptx"))
        for item in result:
            assert "text" in item, f"Missing 'text' key in: {item}"
            assert "slide" in item, f"Missing 'slide' key in: {item}"
            assert "source_file" in item, f"Missing 'source_file' key in: {item}"

    def test_text_non_empty(self) -> None:
        """The 'text' field of every item must be a non-empty string."""
        from parsers.ppt_parser import parse_ppt

        result = parse_ppt(str(FIXTURES_DIR / "sample.pptx"))
        for item in result:
            assert isinstance(item["text"], str), "'text' must be a string"
            assert item["text"].strip(), f"'text' is empty in item: {item}"

    def test_slide_is_integer(self) -> None:
        """The 'slide' field must be a positive integer."""
        from parsers.ppt_parser import parse_ppt

        result = parse_ppt(str(FIXTURES_DIR / "sample.pptx"))
        for item in result:
            assert isinstance(item["slide"], int), f"'slide' must be int, got: {type(item['slide'])}"
            assert item["slide"] >= 1, f"'slide' must be >= 1, got: {item['slide']}"

    def test_source_file_is_filename(self) -> None:
        """The 'source_file' must be only the filename."""
        from parsers.ppt_parser import parse_ppt

        result = parse_ppt(str(FIXTURES_DIR / "sample.pptx"))
        for item in result:
            assert item["source_file"] == "sample.pptx", (
                f"Expected 'sample.pptx', got '{item['source_file']}'"
            )


# ── TXT Parser Tests ──────────────────────────────────────────────────────


class TestTxtParser:
    """Unit tests for parsers.txt_parser.parse_txt."""

    def test_returns_list(self) -> None:
        """parse_txt must return a list."""
        from parsers.txt_parser import parse_txt

        result = parse_txt(str(FIXTURES_DIR / "sample.txt"))
        assert isinstance(result, list), "parse_txt should return a list"

    def test_non_empty(self) -> None:
        """parse_txt must return at least one paragraph."""
        from parsers.txt_parser import parse_txt

        result = parse_txt(str(FIXTURES_DIR / "sample.txt"))
        assert len(result) > 0, "parse_txt returned an empty list"

    def test_required_keys(self) -> None:
        """Every item must have 'text' and 'source_file' keys."""
        from parsers.txt_parser import parse_txt

        result = parse_txt(str(FIXTURES_DIR / "sample.txt"))
        for item in result:
            assert "text" in item, f"Missing 'text' key in: {item}"
            assert "source_file" in item, f"Missing 'source_file' key in: {item}"

    def test_text_non_empty(self) -> None:
        """The 'text' field of every item must be a non-empty string."""
        from parsers.txt_parser import parse_txt

        result = parse_txt(str(FIXTURES_DIR / "sample.txt"))
        for item in result:
            assert isinstance(item["text"], str), "'text' must be a string"
            assert item["text"].strip(), f"'text' is empty in item: {item}"

    def test_paragraphs_split_correctly(self) -> None:
        """The fixture has 3 paragraphs separated by double-newlines."""
        from parsers.txt_parser import parse_txt

        result = parse_txt(str(FIXTURES_DIR / "sample.txt"))
        assert len(result) == 3, (
            f"Expected 3 paragraphs from sample.txt, got {len(result)}"
        )

    def test_source_file_is_filename(self) -> None:
        """The 'source_file' must be only the filename."""
        from parsers.txt_parser import parse_txt

        result = parse_txt(str(FIXTURES_DIR / "sample.txt"))
        for item in result:
            assert item["source_file"] == "sample.txt", (
                f"Expected 'sample.txt', got '{item['source_file']}'"
            )





# ── Chunker Integration Tests ─────────────────────────────────────────────


class TestChunker:
    """Integration smoke-tests for the chunker using pdf parser output."""

    def test_chunk_pdf_output(self) -> None:
        """Chunks from a PDF must all be under 500 chars and preserve metadata."""
        from chunker import chunk_content
        from parsers.pdf_parser import parse_pdf

        raw = parse_pdf(str(FIXTURES_DIR / "sample.pdf"))
        chunks = chunk_content(raw, "pdf")

        assert len(chunks) > 0, "chunk_content returned no chunks"
        for chunk in chunks:
            assert len(chunk["text"]) <= 500, (
                f"Chunk text exceeds 500 chars: {len(chunk['text'])}"
            )
            assert "chunk_id" in chunk
            assert "source_file" in chunk
            assert "source_type" in chunk
            assert chunk["source_type"] == "pdf"
            assert "page_or_timestamp" in chunk
