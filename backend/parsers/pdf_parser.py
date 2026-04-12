"""
Learnify AI — PDF Parser.

Extracts text content from PDF files page by page using pdfplumber.
Handles encrypted or unreadable pages gracefully by logging and skipping.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List

import pdfplumber

logger = logging.getLogger(__name__)


def parse_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract text from a PDF file, producing one dict per page.

    Uses *pdfplumber* for layout-aware text extraction.  Pages that are
    encrypted, image-only, or otherwise unreadable are logged and skipped
    so a single bad page never crashes the whole pipeline.

    Args:
        file_path: Absolute or relative path to the PDF file.

    Returns:
        A list of dicts, each containing:
            - ``text``  — The extracted text content of the page.
            - ``page``  — The 1-based page number.
            - ``source_file`` — The filename of the source PDF.
    """
    path = Path(file_path)
    source_file = path.name
    results: List[Dict[str, Any]] = []

    try:
        with pdfplumber.open(path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                try:
                    text = page.extract_text()
                    if text and text.strip():
                        results.append(
                            {
                                "text": text.strip(),
                                "page": page_num,
                                "source_file": source_file,
                            }
                        )
                    else:
                        logger.warning(
                            "Page %d of '%s' yielded no text — skipping.",
                            page_num,
                            source_file,
                        )
                except Exception as exc:
                    # Gracefully skip corrupted / encrypted pages
                    logger.warning(
                        "Failed to extract text from page %d of '%s': %s — skipping.",
                        page_num,
                        source_file,
                        exc,
                    )
    except Exception as exc:
        logger.error("Failed to open PDF '%s': %s", file_path, exc)
        raise

    return results
