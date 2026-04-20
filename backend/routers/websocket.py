from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
import json
import logging
from datetime import datetime
from database import get_db
from models.schemas import EmotionEvent, EmotionState
from quiz.difficulty_engine import update_score
from app.ml_utils import decode_image, analyze_frame

router = APIRouter()

@router.websocket("/ws/emotion/{session_id}")
async def emotion_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time emotion detection and intervention dispatch.
    
    Can receive either processed emotion states or raw base64 video frames.
    Returns analyzed emotions and interventions if needed.
    """
    await websocket.accept()
    
    from database import _db as db
    
    if db is None:
        logging.error("Database not initialized")
        await websocket.close()
        return

    logging.info(f"WebSocket connected for session: {session_id}")
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
                        "from_frame": True
                    }
                else:
                    continue # Skip if analysis failed
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
            
            # Log EmotionEvent to MongoDB
            event = EmotionEvent(
                session_id=session_id,
                emotion_state=state,
                intervention_triggered=trigger_intervention,
                timestamp=datetime.utcnow()
            )
            await db["emotion_events"].insert_one(event.dict())
            
            # Always send analysis back to frontend if it came from a frame
            response = {
                "state": state,
                "emotion": dominant_emotion,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if "region" in message:
                response["region"] = message["region"]
            
            if trigger_intervention:
                response["intervention"] = intervention
                response["message"] = message_text
            
            await websocket.send_json(response)
                
    except WebSocketDisconnect:
        logging.info(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logging.error(f"Error in WebSocket: {e}")
        if not websocket.client_state.name == "DISCONNECTED":
            await websocket.close()
