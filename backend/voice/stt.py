import whisper
import os
import logging
from fastapi import HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load Whisper model at module level (singleton pattern)
# This downloads ~74MB on first run and is cached locally.
try:
    logger.info("Loading Whisper model 'base'...")
    # This might fail if dependencies are not actually installed yet in the environment 
    # where I'm running this, but it's required by the task.
    model = whisper.load_model("base")
    logger.info("Whisper model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load Whisper model: {e}")
    # We don't want the server to crash on import if the user hasn't installed whisper yet
    model = None

def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribes audio bytes using local Whisper model.

    Args:
        audio_bytes (bytes): The raw audio data.

    Returns:
        str: The transcribed text.

    Raises:
        HTTPException: If the model is not loaded or transcription fails.
    """
    if model is None:
        logger.error("Speech recognition requested but Whisper model is not loaded.")
        raise HTTPException(status_code=503, detail="Speech recognition unavailable")

    # Define temp path
    # Using /tmp/ as requested, but ensuring it works on Windows too
    tmp_dir = "/tmp"
    if not os.path.exists(tmp_dir):
        try:
            os.makedirs(tmp_dir, exist_ok=True)
        except Exception:
            # Fallback to current directory or tempdir if /tmp fails on Windows
            import tempfile
            tmp_dir = tempfile.gettempdir()
    
    file_path = os.path.join(tmp_dir, "audio.webm")

    try:
        # Save bytes to temp file
        with open(file_path, "wb") as f:
            f.write(audio_bytes)

        # Transcribe
        result = model.transcribe(file_path)
        return result.get("text", "").strip()
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up temp file if it exists
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
