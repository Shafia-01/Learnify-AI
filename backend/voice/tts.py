from gtts import gTTS
import os
import tempfile
import logging
from fastapi import HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def synthesize_speech(text: str, language: str = "en") -> bytes:
    """
    Converts text to speech bytes using gTTS.

    Args:
        text (str): The text to synthesize.
        language (str): The language code (e.g., 'en', 'hi', 'ur').

    Returns:
        bytes: The synthesized audio data in MP3 format.

    Raises:
        HTTPException: If synthesis fails.
    """
    # Language code mapping as per requirements:
    # English -> "en", Hindi -> "hi", Urdu -> "ur", French -> "fr", Spanish -> "es", German -> "de"
    # gTTS naturally uses these ISO codes.

    try:
        logger.info(f"Synthesizing speech for text: {text[:50]}... in language: {language}")
        
        # Create gTTS object
        tts = gTTS(text=text, lang=language)
        
        # Save to a temporary file
        # Using tempfile for cross-platform compatibility
        fd, tmp_path = tempfile.mkstemp(suffix=".mp3")
        try:
            os.close(fd) # Close the file descriptor so gTTS can write to it
            tts.save(tmp_path)
            
            # Read the bytes back
            with open(tmp_path, "rb") as f:
                audio_bytes = f.read()
                
            return audio_bytes
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        logger.error(f"TTS error for language {language}: {e}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")
