from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
import json
import logging
from datetime import datetime
from database import get_db
from models.schemas import EmotionEvent, EmotionState
from quiz.difficulty_engine import update_score

router = APIRouter()

@router.websocket("/ws/emotion/{session_id}")
async def emotion_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time emotion detection and intervention dispatch.
    
    Receives emotion states from the ML process and returns interventions if needed.
    Logs each emotion event to MongoDB.
    
    Args:
        websocket (WebSocket): The WebSocket connection.
        session_id (str): The learning session identifier.
    """
    await websocket.accept()
    
    # We can't use Depends(get_db) directly in websocket handlers easily 
    # if we want to use the async generator. We'll get it manually.
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
            state = message.get("state")
            
            intervention = None
            message_text = ""
            trigger_intervention = False
            
            if state == "confusion":
                intervention = "simplify"
                message_text = "Switching to simpler explanation mode."
                trigger_intervention = True
                # Get user_id from session or default to testuser
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
            
            if trigger_intervention:
                response = {
                    "intervention": intervention,
                    "message": message_text
                }
                await websocket.send_json(response)
                
    except WebSocketDisconnect:
        logging.info(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logging.error(f"Error in WebSocket: {e}")
        await websocket.close()
