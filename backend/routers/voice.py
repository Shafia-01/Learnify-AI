import anyio
from fastapi import APIRouter, UploadFile, File, HTTPException, Response
from pydantic import BaseModel
from voice.stt import transcribe_audio
from voice.tts import synthesize_speech
import logging

router = APIRouter(prefix="/voice", tags=["Voice"])
logger = logging.getLogger(__name__)

class SpeakRequest(BaseModel):
    """Request body for text-to-speech synthesis."""
    text: str
    language: str = "en"

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """
    Transcribe an uploaded audio file (multipart/form-data).
    Uses local Whisper model ('base').
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file provided.")
            
        # Run synchronous transcription in a thread pool to avoid blocking the event loop
        text = await anyio.to_thread.run_sync(transcribe_audio, audio_bytes)
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription router error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/speak")
async def speak(request: SpeakRequest):
    """
    Synthesize text into speech and return the audio file (MP3).
    Uses gTTS for free, multilingual speech synthesis. (POST version)
    """
    return await _process_speak(request.text, request.language)


@router.get("/speak")
async def speak_get(text: str, language: str = "en"):
    """
    Synthesize text into speech and return the audio file (MP3).
    Allows calling via GET for easy integration with <audio> tags.
    """
    return await _process_speak(text, language)


async def _process_speak(text: str, language: str) -> Response:
    """Internal helper to process speech synthesis."""
    if not text:
        raise HTTPException(status_code=400, detail="Text for speech synthesis cannot be empty.")
        
    try:
        # Run synchronous synthesis in a thread pool
        audio_bytes = await anyio.to_thread.run_sync(synthesize_speech, text, language)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"Speak router error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def voice_status():
    """Return voice service readiness."""
    return {"service": "voice", "status": "ready"}
