"""
Learnify AI — YouTube Transcript Parser (IP-Block Resistant).

YouTube blocks transcript requests from cloud/VPS IPs. This module implements
a multi-strategy approach to work around this:

Strategy order:
  1. youtube-transcript-api with cookies (if YOUTUBE_COOKIES_FILE is set)
  2. youtube-transcript-api with proxy  (if YT_PROXY is set)
  3. youtube-transcript-api + both      (if both are set)
  4. youtube-transcript-api plain        (works on local machines, fails on cloud)
  5. yt-dlp with cookies                 (if YOUTUBE_COOKIES_FILE is set)
  6. yt-dlp with proxy                   (if YT_PROXY is set)
  7. yt-dlp plain                        (last resort)

Environment variables (add to your backend .env):
  YOUTUBE_COOKIES_FILE  Path to a Netscape-format cookies.txt file.
                        e.g.  YOUTUBE_COOKIES_FILE=/app/youtube_cookies.txt

  YT_PROXY              HTTP or SOCKS5 proxy URL.
                        e.g.  YT_PROXY=socks5://user:pass@host:1080

HOW TO GET COOKIES (one-time setup, works reliably for weeks):
  1. Install "Get cookies.txt LOCALLY" extension in Chrome or Firefox
  2. Navigate to youtube.com and ensure you are logged in
  3. Click the extension icon → "Export" → save as "youtube_cookies.txt"
  4. Copy that file to a path your backend server can read
  5. Add  YOUTUBE_COOKIES_FILE=/full/path/to/youtube_cookies.txt  to your .env
  6. Restart the backend — YouTube ingestion will now work from any server
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_VIDEO_ID_PATTERNS = [
    r"(?:youtube\.com/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})",
    r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
    r"(?:youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
    r"(?:youtube\.com/shorts/)([a-zA-Z0-9_-]{11})",
    r"(?:youtube\.com/live/)([a-zA-Z0-9_-]{11})",
]

_CHUNK_WORD_LIMIT = 400


# ---------------------------------------------------------------------------
# Env helpers
# ---------------------------------------------------------------------------

def _get_cookies_file() -> str | None:
    path = os.environ.get("YOUTUBE_COOKIES_FILE", "").strip()
    if path and os.path.isfile(path):
        logger.debug("Cookie file found: %s", path)
        return path
    if path:
        logger.warning(
            "YOUTUBE_COOKIES_FILE is set to '%s' but the file does not exist.", path
        )
    return None


def _get_proxy() -> str | None:
    val = os.environ.get("YT_PROXY", "").strip()
    return val if val else None


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def _extract_video_id(url: str) -> str:
    """Extract the 11-character video ID from any common YouTube URL."""
    for pattern in _VIDEO_ID_PATTERNS:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    raise HTTPException(
        status_code=400,
        detail=(
            f"Could not extract a YouTube video ID from: {url!r}. "
            "Accepted formats: youtube.com/watch?v=…, youtu.be/…, "
            "shorts/…, live/…, embed/…"
        ),
    )


# ---------------------------------------------------------------------------
# Strategy A — youtube-transcript-api
# ---------------------------------------------------------------------------

def _transcript_api_fetch(
    video_id: str,
    cookies_file: str | None = None,
    proxies: dict | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch transcript using youtube-transcript-api.
    Raises RuntimeError on any failure so the caller can try the next strategy.
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError as exc:
        raise RuntimeError("youtube-transcript-api is not installed") from exc

    try:
        api_kwargs: dict[str, Any] = {}
        if cookies_file:
            api_kwargs["cookies"] = cookies_file
        if proxies:
            api_kwargs["proxies"] = proxies

        api = YouTubeTranscriptApi(**api_kwargs)
        transcript_list = api.list(video_id)

        preferred_langs = ["en", "en-US", "en-GB", "en-AU", "en-CA"]
        transcript = None

        # 1. Manual captions in English
        for lang in preferred_langs:
            try:
                transcript = transcript_list.find_manually_created_transcript([lang])
                logger.info("Found manual transcript (%s) for %s", lang, video_id)
                break
            except Exception:
                continue

        # 2. Auto-generated captions in English
        if transcript is None:
            for lang in preferred_langs:
                try:
                    transcript = transcript_list.find_generated_transcript([lang])
                    logger.info(
                        "Found auto-generated transcript (%s) for %s", lang, video_id
                    )
                    break
                except Exception:
                    continue

        # 3. Any available language (attempt English translation)
        if transcript is None:
            all_transcripts = list(transcript_list)
            if not all_transcripts:
                raise RuntimeError(f"No transcripts found for {video_id}")
            transcript = all_transcripts[0]
            try:
                transcript = transcript.translate("en")
                logger.info("Translated transcript to English for %s", video_id)
            except Exception:
                logger.info(
                    "Using non-English transcript (%s) for %s",
                    transcript.language_code, video_id,
                )

        fetched = transcript.fetch()

        segments: list[dict[str, Any]] = []
        for snippet in fetched:
            # Handle both object-style (v2+) and dict-style (older) responses
            if hasattr(snippet, "text"):
                segments.append({
                    "text":     snippet.text,
                    "start":    float(getattr(snippet, "start", 0.0)),
                    "duration": float(getattr(snippet, "duration", 2.0)),
                })
            else:
                segments.append({
                    "text":     snippet.get("text", ""),
                    "start":    float(snippet.get("start", 0.0)),
                    "duration": float(snippet.get("duration", 2.0)),
                })

        if not segments:
            raise RuntimeError("Fetched transcript contained no segments")

        logger.info(
            "youtube-transcript-api: %d segments for %s", len(segments), video_id
        )
        return segments

    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"youtube-transcript-api: {exc}") from exc


# ---------------------------------------------------------------------------
# Strategy B — yt-dlp
# ---------------------------------------------------------------------------

def _ytdlp_fetch(
    video_id: str,
    cookies_file: str | None = None,
    proxy: str | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch transcript via yt-dlp subtitle extraction.
    Raises RuntimeError on any failure.
    """
    try:
        import yt_dlp
    except ImportError as exc:
        raise RuntimeError("yt-dlp is not installed") from exc

    import json
    import urllib.request

    url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts: dict[str, Any] = {
        "writesubtitles":    True,
        "writeautomaticsub": True,
        "subtitleslangs":    ["en", "en-US", "en-GB"],
        "subtitlesformat":   "json3",
        "skip_download":     True,
        "quiet":             True,
        "no_warnings":       True,
    }
    if cookies_file:
        ydl_opts["cookiefile"] = cookies_file
    if proxy:
        ydl_opts["proxy"] = proxy

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as exc:
        raise RuntimeError(f"yt-dlp info extraction failed: {exc}") from exc

    subs = info.get("subtitles") or {}
    auto = info.get("automatic_captions") or {}

    en_entries = (
        subs.get("en") or subs.get("en-US") or subs.get("en-GB")
        or auto.get("en") or auto.get("en-US") or auto.get("en-GB")
    )
    if not en_entries:
        for entries in {**subs, **auto}.values():
            if entries:
                en_entries = entries
                break

    if not en_entries:
        raise RuntimeError(f"yt-dlp: no subtitle tracks found for {video_id}")

    # Choose the best format available
    sub_url: str | None = None
    for preferred_ext in ("json3", "vtt", "srv3", "srv2", "srv1", "ttml"):
        for fmt in en_entries:
            if fmt.get("ext") == preferred_ext:
                sub_url = fmt.get("url")
                break
        if sub_url:
            break
    if not sub_url and en_entries:
        sub_url = en_entries[0].get("url")

    if not sub_url:
        raise RuntimeError(f"yt-dlp: no usable subtitle URL for {video_id}")

    try:
        req = urllib.request.Request(
            sub_url, headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
    except Exception as exc:
        raise RuntimeError(f"yt-dlp: subtitle download failed: {exc}") from exc

    segments: list[dict[str, Any]] = []

    # Parse json3 (richer, has timestamps)
    if raw.lstrip().startswith("{"):
        try:
            data = json.loads(raw)
            for event in data.get("events", []):
                segs = event.get("segs", [])
                if not segs:
                    continue
                text = "".join(s.get("utf8", "") for s in segs).strip()
                text = re.sub(r"\n+", " ", text).strip()
                if text and text != "\n":
                    segments.append({
                        "text":     text,
                        "start":    event.get("tStartMs", 0) / 1000.0,
                        "duration": event.get("dDurationMs", 2000) / 1000.0,
                    })
            if segments:
                logger.info(
                    "yt-dlp json3: %d segments for %s", len(segments), video_id
                )
                return segments
        except Exception:
            pass  # fall through to VTT parsing

    # Parse WebVTT (less structure but still usable)
    for line in raw.splitlines():
        line = line.strip()
        if (
            not line
            or "-->" in line
            or line.startswith("WEBVTT")
            or line.isdigit()
            or line.startswith("NOTE")
            or line.startswith("STYLE")
        ):
            continue
        clean = re.sub(r"<[^>]+>", "", line).strip()
        if clean:
            segments.append({"text": clean, "start": 0.0, "duration": 2.0})

    if not segments:
        raise RuntimeError(
            f"yt-dlp: subtitle parsing produced no segments for {video_id}"
        )

    logger.info("yt-dlp vtt: %d segments for %s", len(segments), video_id)
    return segments


# ---------------------------------------------------------------------------
# Chunk assembler
# ---------------------------------------------------------------------------

def _group_into_chunks(
    segments: list[dict[str, Any]], source_url: str
) -> list[dict[str, Any]]:
    """Group raw transcript segments into ~400-word chunks for RAG."""
    chunks: list[dict[str, Any]] = []
    current_words: list[str] = []
    current_start: float = 0.0
    word_count: int = 0

    for segment in segments:
        raw = segment.get("text", "").strip()
        raw = re.sub(r"<[^>]+>", "", raw)       # strip HTML tags
        raw = re.sub(r"\[.*?\]", "", raw)        # strip [Music] etc.
        raw = re.sub(r"\s+", " ", raw).strip()
        if not raw:
            continue

        words = raw.split()
        if word_count == 0:
            current_start = float(segment.get("start", 0.0))

        current_words.extend(words)
        word_count += len(words)

        if word_count >= _CHUNK_WORD_LIMIT:
            chunks.append({
                "text":            " ".join(current_words),
                "timestamp_start": current_start,
                "source_file":     source_url,
            })
            current_words = []
            word_count    = 0
            current_start = 0.0

    if current_words:
        chunks.append({
            "text":            " ".join(current_words),
            "timestamp_start": current_start,
            "source_file":     source_url,
        })

    return chunks


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_youtube(url: str) -> list[dict[str, Any]]:
    """
    Parse a YouTube URL into transcript chunks for the RAG pipeline.

    Tries multiple strategies automatically. On cloud servers, set
    YOUTUBE_COOKIES_FILE in your .env for reliable operation.

    Returns list of dicts with keys: text, timestamp_start, source_file.
    Raises HTTPException 400 for invalid URLs, 404 if no transcript found.
    """
    video_id     = _extract_video_id(url)
    cookies_file = _get_cookies_file()
    proxy        = _get_proxy()
    proxy_dict   = {"https": proxy, "http": proxy} if proxy else None

    # Build strategy list — ordered from most likely to succeed to least
    # Each entry is (description, callable)
    strategies: list[tuple[str, Any]] = []

    # youtube-transcript-api strategies
    if cookies_file and proxy_dict:
        strategies.append((
            "youtube-transcript-api + cookies + proxy",
            lambda: _transcript_api_fetch(
                video_id, cookies_file=cookies_file, proxies=proxy_dict
            ),
        ))
    if cookies_file:
        strategies.append((
            "youtube-transcript-api + cookies",
            lambda: _transcript_api_fetch(video_id, cookies_file=cookies_file),
        ))
    if proxy_dict:
        strategies.append((
            "youtube-transcript-api + proxy",
            lambda: _transcript_api_fetch(video_id, proxies=proxy_dict),
        ))
    strategies.append((
        "youtube-transcript-api (plain)",
        lambda: _transcript_api_fetch(video_id),
    ))

    # yt-dlp strategies
    if cookies_file and proxy:
        strategies.append((
            "yt-dlp + cookies + proxy",
            lambda: _ytdlp_fetch(video_id, cookies_file=cookies_file, proxy=proxy),
        ))
    if cookies_file:
        strategies.append((
            "yt-dlp + cookies",
            lambda: _ytdlp_fetch(video_id, cookies_file=cookies_file),
        ))
    if proxy:
        strategies.append((
            "yt-dlp + proxy",
            lambda: _ytdlp_fetch(video_id, proxy=proxy),
        ))
    strategies.append((
        "yt-dlp (plain)",
        lambda: _ytdlp_fetch(video_id),
    ))

    segments: list[dict[str, Any]] | None = None
    errors: list[str] = []

    for strategy_name, strategy_fn in strategies:
        try:
            logger.info("[YouTube] Trying: %s", strategy_name)
            result = strategy_fn()
            if result:
                segments = result
                logger.info(
                    "[YouTube] Success: %s → %d segments", strategy_name, len(segments)
                )
                break
        except RuntimeError as exc:
            msg = f"[{strategy_name}] {exc}"
            errors.append(msg)
            logger.warning("[YouTube] Failed: %s", msg)
        except Exception as exc:
            msg = f"[{strategy_name}] unexpected error: {exc}"
            errors.append(msg)
            logger.exception("[YouTube] Unexpected failure in %s", strategy_name)

    if not segments:
        # Build a helpful error message depending on what's configured
        if cookies_file:
            tip = (
                "Your cookies file was found but authentication still failed — "
                "the cookies may be expired. Re-export fresh cookies from your "
                "browser (while logged into YouTube) and replace the file."
            )
        else:
            tip = (
                "FIX: Export your YouTube browser cookies and set "
                "YOUTUBE_COOKIES_FILE=/path/to/youtube_cookies.txt in your .env. "
                "Steps: (1) Install 'Get cookies.txt LOCALLY' browser extension, "
                "(2) Go to youtube.com while logged in, "
                "(3) Click extension → Export → save file, "
                "(4) Add YOUTUBE_COOKIES_FILE= to your backend .env, "
                "(5) Restart the server."
            )

        raise HTTPException(
            status_code=404,
            detail=(
                "Could not retrieve a transcript for this YouTube video. "
                "YouTube is blocking requests from this server's IP address "
                "(this is normal for cloud/VPS deployments). "
                f"{tip} "
                f"Technical details: {' | '.join(errors)}"
            ),
        )

    chunks = _group_into_chunks(segments, url)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail=(
                "Transcript was retrieved but contained no usable text. "
                "Try a video that has spoken content and captions enabled."
            ),
        )

    logger.info(
        "[YouTube] Done: %d chunks from %d segments for %s",
        len(chunks), len(segments), video_id,
    )
    return chunks