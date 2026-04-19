"""
Learnify AI — YouTube Transcript Parser.

Uses yt-dlp as primary method (better IP handling) with
youtube-transcript-api as fallback.
"""

import logging
import re
import tempfile
import os
from typing import Any, Dict, List

from fastapi import HTTPException

logger = logging.getLogger(__name__)


def _extract_video_id(url: str) -> str:
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


def _fetch_with_ytdlp(video_id: str) -> List[Dict[str, Any]]:
    """Fetch transcript via yt-dlp — handles cloud IP blocks better."""
    import yt_dlp

    ydl_opts = {
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en"],
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
    }

    # Optional: add proxy from env var
    proxy = os.environ.get("YT_PROXY")
    if proxy:
        ydl_opts["proxy"] = proxy

    url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        # Pull subtitle text from the info dict
        subtitles = info.get("subtitles") or info.get("automatic_captions") or {}
        en_subs = subtitles.get("en") or subtitles.get("en-orig") or []

        if not en_subs:
            # Try any available language
            for lang, entries in subtitles.items():
                if entries:
                    en_subs = entries
                    break

        if not en_subs:
            raise ValueError("No subtitles found")

        # Find a JSON3 or srv3 format (structured with timestamps)
        json_url = None
        for fmt in en_subs:
            if fmt.get("ext") in ("json3", "srv3", "vtt"):
                json_url = fmt.get("url")
                break

        if not json_url:
            raise ValueError("No usable subtitle format")

        import urllib.request
        import json

        with urllib.request.urlopen(json_url, timeout=10) as resp:
            raw = resp.read().decode("utf-8")

        # Parse JSON3 format
        if json_url.endswith("json3") or "json3" in json_url:
            data = json.loads(raw)
            segments = []
            for event in data.get("events", []):
                if "segs" not in event:
                    continue
                text = "".join(s.get("utf8", "") for s in event["segs"]).strip()
                if text:
                    segments.append({
                        "text": text,
                        "start": event.get("tStartMs", 0) / 1000,
                        "duration": event.get("dDurationMs", 2000) / 1000,
                    })
            return segments

        # VTT fallback: strip timing lines
        lines = []
        for line in raw.splitlines():
            line = line.strip()
            if not line or "-->" in line or line.isdigit() or line.startswith("WEBVTT"):
                continue
            # Strip HTML tags
            line = re.sub(r"<[^>]+>", "", line)
            if line:
                lines.append({"text": line, "start": 0.0, "duration": 2.0})
        return lines

    except Exception as e:
        raise RuntimeError(f"yt-dlp failed: {e}") from e


def _fetch_with_transcript_api(video_id: str) -> List[Dict[str, Any]]:
    """Fallback using youtube-transcript-api."""
    from youtube_transcript_api import YouTubeTranscriptApi

    transcript_list = YouTubeTranscriptApi().list(video_id)
    try:
        transcript = transcript_list.find_transcript(["en"])
    except Exception:
        transcript = next(iter(transcript_list))
    return transcript.fetch()


def _group_into_chunks(segments: List[Dict[str, Any]], url: str) -> List[Dict[str, Any]]:
    """Group transcript segments into ~500-word chunks."""
    chunks: List[Dict[str, Any]] = []
    current_words: List[str] = []
    current_start: float = 0.0
    word_count: int = 0

    for segment in segments:
        text = segment.get("text", "").strip()
        if not text:
            continue
        if word_count == 0:
            current_start = segment.get("start", 0.0)
        words = text.split()
        current_words.extend(words)
        word_count += len(words)
        if word_count >= 500:
            chunks.append({
                "text": " ".join(current_words),
                "timestamp_start": current_start,
                "source_file": url,
            })
            current_words = []
            word_count = 0

    if current_words:
        chunks.append({
            "text": " ".join(current_words),
            "timestamp_start": current_start,
            "source_file": url,
        })

    return chunks


def parse_youtube(url: str) -> List[Dict[str, Any]]:
    video_id = _extract_video_id(url)
    segments = None
    last_error = None

    # Try yt-dlp first
    try:
        segments = _fetch_with_ytdlp(video_id)
        logger.info("Fetched transcript via yt-dlp for %s", video_id)
    except Exception as e:
        last_error = e
        logger.warning("yt-dlp failed for %s: %s — trying fallback", video_id, e)

    # Fallback to youtube-transcript-api
    if not segments:
        try:
            segments = _fetch_with_transcript_api(video_id)
            logger.info("Fetched transcript via youtube-transcript-api for %s", video_id)
        except Exception as e:
            last_error = e
            logger.error("Both methods failed for %s: %s", video_id, e)

    if not segments:
        raise HTTPException(
            status_code=404,
            detail=(
                "No captions available for this video, or YouTube is blocking "
                "requests from this server's IP. Try running locally or set the "
                "YT_PROXY environment variable."
            ),
        )

    return _group_into_chunks(segments, url)