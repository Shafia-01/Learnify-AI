"""
Learnify AI — WebSocket Router.

Handles real-time emotion detection and adaptive intervention dispatch.
"""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from database import get_db
from models.schemas import EmotionEvent, EmotionState
from quiz.difficulty_engine import update_score
from app.ml_utils import decode_image, analyze_frame

router = APIRouter()

logger = logging.getLogger(__name__)

# Valid emotion state values for validation
_VALID_STATES = {e.value for e in EmotionState}


@router.websocket("/ws/emotion/{session_id}")
async def emotion_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time emotion detection and intervention dispatch.

    Can receive either processed emotion states or raw base64 video frames.
    Returns analyzed emotions and interventions if needed.
    """
    await websocket.accept()

    # Obtain the database handle via the async generator dependency directly.
    # This avoids importing the private _db variable which is None at import time.
    try:
        db_gen = get_db()
        db = await db_gen.__anext__()
    except RuntimeError as exc:
        logger.error("Database not initialized: %s", exc)
        await websocket.close(code=1011)
        return

    logger.info("WebSocket connected for session: %s", session_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Check if this is a raw frame from the frontend
            if "frame" in message:
                frame = decode_image(message["frame"])
                analysis = await analyze_frame(frame, session_id)
                if analysis:
                    state = analysis["state"]
                    dominant_emotion = analysis["emotion"]
                    region = analysis["region"]

                    # Store current analysis in a message-like format to reuse logic below
                    message = {
                        "state": state,
                        "dominant_emotion": dominant_emotion,
                        "region": region,
                        "from_frame": True,
                    }
                else:
                    continue  # Skip if analysis failed
            else:
                state = message.get("state")
                dominant_emotion = message.get("dominant_emotion", "unknown")

            intervention = None
            message_text = ""
            trigger_intervention = False

            if state == "confusion":
                intervention = "simplify"
                message_text = "Switching to simpler explanation mode."
                trigger_intervention = True
                session_data = await db["sessions"].find_one({"session_id": session_id})
                user_id = session_data.get("user_id") if session_data else "testuser"
                await update_score(db, user_id, is_correct=False)

            elif state == "fatigue":
                intervention = "break"
                message_text = "You look tired. Take a 5-minute break?"
                trigger_intervention = True

            elif state == "frustration":
                intervention = "analogy"
                message_text = "Let me try a different approach with an analogy."
                trigger_intervention = True

            # Log EmotionEvent to MongoDB — only when state is a valid EmotionState value
            if state in _VALID_STATES:
                event = EmotionEvent(
                    session_id=session_id,
                    emotion_state=state,
                    intervention_triggered=trigger_intervention,
                    timestamp=datetime.utcnow(),
                )
                await db["emotion_events"].insert_one(event.model_dump())

            # Always send analysis back to frontend
            response = {
                "state": state,
                "emotion": dominant_emotion,
                "timestamp": datetime.utcnow().isoformat(),
            }

            if "region" in message:
                response["region"] = message["region"]

            if trigger_intervention:
                response["intervention"] = intervention
                response["message"] = message_text

            await websocket.send_json(response)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for session: %s", session_id)
    except Exception as exc:
        logger.error("Error in WebSocket for session %s: %s", session_id, exc)
        try:
            await websocket.close()
        except Exception:
            pass
