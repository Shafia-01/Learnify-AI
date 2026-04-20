import cv2
import numpy as np
import base64
import asyncio
from deepface import DeepFace
from collections import deque, Counter
import time

EMOTION_MAP = {
    "happy": "attention",
    "neutral": "attention",
    "fear": "confusion",
    "surprise": "confusion",
    "sad": "fatigue",
    "angry": "frustration",
    "disgust": "frustration"
}

# In-memory buffer for smoothing per session
session_buffers = {}

def decode_image(base64_string):
    """Decodes a base64 string into an OpenCV image."""
    try:
        # Remove header if present
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

async def analyze_frame(frame, session_id):
    """Runs DeepFace analysis on a single frame."""
    if frame is None:
        return None
    
    try:
        # Run DeepFace in a thread to keep async loop free
        result = await asyncio.to_thread(
            DeepFace.analyze, 
            frame, 
            actions=["emotion"], 
            enforce_detection=False,
            silent=True
        )
        
        if isinstance(result, list):
            result = result[0]
            
        raw_emotion = result.get("dominant_emotion", "neutral")
        
        # Smoothing logic
        if session_id not in session_buffers:
            session_buffers[session_id] = deque(maxlen=5)
        
        buffer = session_buffers[session_id]
        buffer.append(raw_emotion)
        
        smoothed_emotion = Counter(buffer).most_common(1)[0][0]
        state = EMOTION_MAP.get(smoothed_emotion, "attention")
        
        return {
            "emotion": smoothed_emotion,
            "state": state,
            "region": result.get("region", {"x": 0, "y": 0, "w": 0, "h": 0}),
            "timestamp": time.time()
        }
    except Exception as e:
        print(f"DeepFace analysis error: {e}")
        return None
