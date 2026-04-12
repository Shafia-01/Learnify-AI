"""
Learnify AI — Plain Text Parser.

Splits plain-text files into paragraphs using double newlines (blank lines)
as delimiters.  Each paragraph becomes one parsed item for the chunking
pipeline.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def parse_txt(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse a plain text file into paragraph-level items.

    Paragraphs are delimited by one or more blank lines (double newlines).
    Leading/trailing whitespace is stripped from every paragraph and empty
    paragraphs are discarded.

    Args:
        file_path: Absolute or relative path to the text file.

    Returns:
        A list of dicts, each containing:
            - ``text``  — The paragraph text.
            - ``source_file`` — The filename of the source text file.
    """
    path = Path(file_path)
    source_file = path.name

    content = path.read_text(encoding="utf-8", errors="replace")

    # Split on one or more blank lines
    raw_paragraphs = content.split("\n\n")

    results: List[Dict[str, Any]] = []
    for paragraph in raw_paragraphs:
        cleaned = paragraph.strip()
        if cleaned:
            results.append(
                {
                    "text": cleaned,
                    "source_file": source_file,
                }
            )

    if not results:
        logger.warning("Text file '%s' produced no paragraphs.", source_file)

    return results
