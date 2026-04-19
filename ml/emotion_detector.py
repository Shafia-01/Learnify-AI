import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import cv2
import asyncio
import json
import websockets
import time
import warnings
from collections import deque, Counter
from deepface import DeepFace

# Silence TensorFlow deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*The name tf.losses.sparse_softmax_cross_entropy is deprecated.*")

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
    Detects emotion from the webcam with smoothing and high-FPS preview.
    """
    uri = f"ws://localhost:8000/ws/emotion/{session_id}"
    cap = cv2.VideoCapture(0)
    
    # State shared between loops
    latest_info = {
        "emotion": "neutral",
        "state": "attention",
        "region": {"x": 0, "y": 0, "w": 0, "h": 0},
        "last_update": 0
    }
    
    # Smoothing buffer (last 5 detections)
    emotion_buffer = deque(maxlen=5)
    
    async def analysis_loop(websocket):
        """Background task for heavy ML analysis (once every 2s)"""
        while True:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(1)
                continue
            
            try:
                # DeepFace analysis in a thread
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
                emotion_buffer.append(raw_emotion)
                
                # Smoothed emotion based on majority vote
                smoothed_emotion = Counter(emotion_buffer).most_common(1)[0][0]
                state = EMOTION_MAP.get(smoothed_emotion, "attention")
                
                latest_info["emotion"] = smoothed_emotion
                latest_info["state"] = state
                latest_info["region"] = result.get("region", {"x":0, "y":0, "w":0, "h":0})
                latest_info["last_update"] = time.time()
                
                # Send to backend
                message = {
                    "state": state,
                    "dominant_emotion": smoothed_emotion,
                    "timestamp": time.time()
                }
                print(f"[{smoothed_emotion.upper()}] -> Backend: {state}")
                await websocket.send(json.dumps(message))
                
            except Exception as e:
                print(f"Analysis error: {e}")
                if "closed" in str(e).lower(): break
            
            await asyncio.sleep(1.5) # Run analysis every 1.5 seconds

    while True:
        try:
            print(f"Connecting to {uri}...")
            async with websockets.connect(uri, ping_interval=20, ping_timeout=20) as websocket:
                print("Connected to WebSocket.")
                
                # Start analysis in background
                analysis_task = asyncio.create_task(analysis_loop(websocket))
                
                try:
                    # Main loop for high-FPS camera preview
                    while True:
                        ret, frame = cap.read()
                        if not ret: break
                        
                        # Use latest available info for drawing
                        r = latest_info["region"]
                        state = latest_info["state"]
                        emotion = latest_info["emotion"]
                        
                        # Feedback color
                        color = (0, 255, 0) # Green
                        if state == "frustration": color = (0, 0, 255) # Red
                        elif state == "confusion": color = (0, 255, 255) # Yellow
                        elif state == "fatigue": color = (255, 0, 0) # Blue
                        
                        if r["w"] > 0:
                            cv2.rectangle(frame, (r["x"], r["y"]), (r["x"] + r["w"], r["y"] + r["h"]), color, 2)
                            cv2.putText(frame, f"{emotion} ({state})", (r["x"], r["y"] - 10), 
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                        
                        cv2.putText(frame, "LIVE PREVIEW", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                        
                        cv2.imshow("Learnify AI - Emotion Detector", frame)
                        
                        if cv2.waitKey(1) & 0xFF == ord('q'):
                            cap.release()
                            cv2.destroyAllWindows()
                            return
                        
                        await asyncio.sleep(0.01) # Small sleep to yield to analysis task
                        
                finally:
                    analysis_task.cancel()
                    
        except Exception as e:
            print(f"Connection error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)
            
if __name__ == "__main__":
    # Initialize with session1 for testing
    asyncio.run(detect_emotion("session1"))
