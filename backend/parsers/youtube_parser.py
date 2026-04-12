"""
Learnify AI — YouTube Transcript Parser.

Extracts video transcripts using the YouTube Transcript API and groups
transcript segments into chunks of approximately 500 words each.
Timestamps are preserved so chunks can be linked back to the video timeline.
"""

import logging
import re
from typing import Any, Dict, List

from fastapi import HTTPException
from youtube_transcript_api import YouTubeTranscriptApi

logger = logging.getLogger(__name__)


def _extract_video_id(url: str) -> str:
    """
    Extract the YouTube video ID from various URL formats.

    Supported formats:
        - ``https://www.youtube.com/watch?v=VIDEO_ID``
        - ``https://youtu.be/VIDEO_ID``
        - ``https://www.youtube.com/embed/VIDEO_ID``
        - ``https://www.youtube.com/watch?v=VIDEO_ID&list=...``

    Args:
        url: A YouTube video URL.

    Returns:
        The 11-character video ID string.

    Raises:
        HTTPException: If the video ID cannot be extracted.
    """
    patterns = [
        r"(?:youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})",
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    raise HTTPException(
        status_code=400,
        detail=f"Could not extract video ID from URL: {url}",
    )


def parse_youtube(url: str) -> List[Dict[str, Any]]:
    """
    Fetch the transcript of a YouTube video and group segments into chunks.

    Each chunk contains approximately 500 words.  The ``timestamp_start``
    field records the start time (in seconds) of the first segment in
    each chunk, enabling playback-position linking in the frontend.

    Args:
        url: A YouTube video URL.

    Returns:
        A list of dicts, each containing:
            - ``text`` — The transcript chunk (~500 words).
            - ``timestamp_start`` — Start time in seconds for the chunk.
            - ``source_file`` — The original YouTube URL.

    Raises:
        HTTPException: If no captions are available for the video.
    """
    video_id = _extract_video_id(url)

    try:
        transcript_segments = YouTubeTranscriptApi.get_transcript(video_id)
    except Exception as exc:
        logger.error(
            "Failed to fetch transcript for video '%s': %s", video_id, exc
        )
        raise HTTPException(
            status_code=404,
            detail="No captions available for this video.",
        ) from exc

    # ── Group segments into ~500-word chunks ──────────────────────────
    chunks: List[Dict[str, Any]] = []
    current_words: List[str] = []
    current_start: float = 0.0
    word_count: int = 0

    for segment in transcript_segments:
        segment_text = segment.get("text", "").strip()
        if not segment_text:
            continue

        # Record the timestamp of the first segment in a new chunk
        if word_count == 0:
            current_start = segment.get("start", 0.0)

        segment_words = segment_text.split()
        current_words.extend(segment_words)
        word_count += len(segment_words)

        if word_count >= 500:
            chunks.append(
                {
                    "text": " ".join(current_words),
                    "timestamp_start": current_start,
                    "source_file": url,
                }
            )
            current_words = []
            word_count = 0

    # Flush any remaining words into a final chunk
    if current_words:
        chunks.append(
            {
                "text": " ".join(current_words),
                "timestamp_start": current_start,
                "source_file": url,
            }
        )

    return chunks
