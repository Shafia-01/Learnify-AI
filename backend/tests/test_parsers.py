"""
Learnify AI — Parser Unit Tests.

Tests each parser (pdf, ppt, txt, youtube) against sample fixture files.
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


# ── YouTube Parser Tests ──────────────────────────────────────────────────


class TestYoutubeParser:
    """Unit tests for parsers.youtube_parser functions."""

    def test_extract_video_id_standard_url(self) -> None:
        """_extract_video_id must parse a standard watch URL."""
        from parsers.youtube_parser import _extract_video_id

        video_id = _extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_short_url(self) -> None:
        """_extract_video_id must parse a youtu.be short URL."""
        from parsers.youtube_parser import _extract_video_id

        video_id = _extract_video_id("https://youtu.be/dQw4w9WgXcQ")
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_embed_url(self) -> None:
        """_extract_video_id must parse an embed URL."""
        from parsers.youtube_parser import _extract_video_id

        video_id = _extract_video_id("https://www.youtube.com/embed/dQw4w9WgXcQ")
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_invalid_raises(self) -> None:
        """_extract_video_id must raise HTTPException for invalid URLs."""
        from fastapi import HTTPException

        from parsers.youtube_parser import _extract_video_id

        with pytest.raises(HTTPException) as exc_info:
            _extract_video_id("https://example.com/not-youtube")
        assert exc_info.value.status_code == 400

    def test_parse_youtube_no_captions_raises(self) -> None:
        """parse_youtube must raise HTTPException(404) for a non-existent ID."""
        from unittest.mock import patch

        from fastapi import HTTPException
        from youtube_transcript_api import TranscriptsDisabled

        from parsers.youtube_parser import parse_youtube

        with patch(
            "parsers.youtube_parser.YouTubeTranscriptApi.get_transcript",
            side_effect=TranscriptsDisabled("fakeid"),
        ):
            with pytest.raises(HTTPException) as exc_info:
                parse_youtube("https://www.youtube.com/watch?v=fakeid123XY")
            assert exc_info.value.status_code == 404
            assert "No captions available" in exc_info.value.detail

    def test_parse_youtube_chunk_structure(self) -> None:
        """parse_youtube must return correctly structured dicts from mocked transcript."""
        from unittest.mock import patch

        from parsers.youtube_parser import parse_youtube

        fake_segments = [
            {"text": f"word{i}", "start": float(i * 2), "duration": 2.0}
            for i in range(10)
        ]

        with patch(
            "parsers.youtube_parser.YouTubeTranscriptApi.get_transcript",
            return_value=fake_segments,
        ):
            result = parse_youtube("https://www.youtube.com/watch?v=dQw4w9WgXcQ")

        assert isinstance(result, list), "parse_youtube should return a list"
        assert len(result) > 0, "parse_youtube returned an empty list"
        for item in result:
            assert "text" in item, f"Missing 'text' key in: {item}"
            assert "timestamp_start" in item, f"Missing 'timestamp_start' key in: {item}"
            assert "source_file" in item, f"Missing 'source_file' key in: {item}"
            assert isinstance(item["text"], str) and item["text"].strip()


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
