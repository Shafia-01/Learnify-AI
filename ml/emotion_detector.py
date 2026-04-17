import cv2
import asyncio
import json
import websockets
import time
from deepface import DeepFace

EMOTION_MAP = {
    "happy": "attention",
    "neutral": "attention",
    "fear": "confusion",
    "surprise": "confusion",
    "sad": "fatigue",
    "angry": "frustration",
    "disgust": "frustration"
}

async def detect_emotion(session_id: str):
    """
    Detects emotion from the webcam and sends it to the backend via WebSocket.
    
    Args:
        session_id (str): The session identifier.
    """
    uri = f"ws://localhost:8000/ws/emotion/{session_id}"
    
    cap = cv2.VideoCapture(0)
    
    while True:
        try:
            print(f"Connecting to {uri}...")
            async with websockets.connect(uri) as websocket:
                print("Connected to WebSocket.")
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        print("Camera unavailable. Retrying in 5 seconds...")
                        await asyncio.sleep(5)
                        cap.release()
                        cap = cv2.VideoCapture(0)
                        continue
                    
                    try:
                        result = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False)
                        if isinstance(result, list):
                            result = result[0]
                        
                        dominant_emotion = result.get("dominant_emotion", "neutral")
                        state = EMOTION_MAP.get(dominant_emotion, "neutral")
                        
                        message = {
                            "state": state,
                            "dominant_emotion": dominant_emotion,
                            "timestamp": time.time()
                        }
                        
                        print(f"Sending emotion state: {state} (from {dominant_emotion})")
                        await websocket.send(json.dumps(message))
                        
                    except Exception as e:
                        print(f"Error analyzing frame: {e}")
                    
                    await asyncio.sleep(3)
                    
        except Exception as e:
            print(f"WebSocket connection error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)
            
if __name__ == "__main__":
    # Initialize with session1 for testing
    asyncio.run(detect_emotion("session1"))
