import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import './EmotionPanel.css';

const EmotionPanel = ({ sessionId = "session1" }) => {
  const webcamRef = useRef(null);
  const [emotionData, setEmotionData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const intervalRef = useRef(null);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);

  const connectWS = useCallback(() => {
    if (!mountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/emotion/${sessionId}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      if (mountedRef.current) setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        setEmotionData(data);
      } catch (_) {}
    };

    ws.current.onclose = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      // Reconnect after 5 seconds, only if still mounted
      reconnectTimer.current = setTimeout(connectWS, 5000);
    };

    ws.current.onerror = (err) => {
      console.error('WebSocket Error:', err);
      // Close explicitly so onclose fires and triggers reconnect
      ws.current?.close();
    };
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
    connectWS();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ws.current) {
        ws.current.onclose = null; // prevent reconnect on deliberate close
        ws.current.close();
      }
    };
  }, [connectWS]);

  const captureFrame = useCallback(() => {
    if (webcamRef.current && ws.current && ws.current.readyState === WebSocket.OPEN) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        ws.current.send(JSON.stringify({ frame: imageSrc }));
      }
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      // Capture frame every 2 seconds to avoid overloading server
      intervalRef.current = setInterval(captureFrame, 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected, captureFrame]);

  const getStatusColor = (state) => {
    switch (state) {
      case 'frustration': return '#ef4444'; // red-500
      case 'confusion': return '#f59e0b'; // amber-500
      case 'fatigue': return '#3b82f6'; // blue-500
      case 'attention': return '#10b981'; // emerald-500
      default: return '#6b7280'; // gray-500
    }
  };

  return (
    <div className="emotion-panel">
      <div className="panel-header">
        <h3>AI Learning Monitor</h3>
        <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'LIVE' : 'RECONNECTING...'}
        </div>
      </div>

      <div className="webcam-container">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 320,
            height: 240,
            facingMode: "user"
          }}
          className="webcam-feed"
        />
        {emotionData?.region && (
           <div 
             className="face-box"
             style={{
               left: `${(emotionData.region.x / 640) * 100}%`,
               top: `${(emotionData.region.y / 480) * 100}%`,
               width: `${(emotionData.region.w / 640) * 100}%`,
               height: `${(emotionData.region.h / 480) * 100}%`,
               borderColor: getStatusColor(emotionData.state)
             }}
           />
        )}
      </div>

      <div className="emotion-stats">
        <div className="stat-item">
          <span className="label">Emotion:</span>
          <span className="value" style={{ color: getStatusColor(emotionData?.state) }}>
            {emotionData?.emotion || 'Detecting...'}
          </span>
        </div>
        <div className="stat-item">
          <span className="label">State:</span>
          <span className="value" style={{ color: getStatusColor(emotionData?.state) }}>
            {emotionData?.state || 'Waiting...'}
          </span>
        </div>
      </div>

      {emotionData?.intervention && (
        <div className="intervention-alert" style={{ backgroundColor: getStatusColor(emotionData.state) + '22', borderLeftColor: getStatusColor(emotionData.state) }}>
          <p>{emotionData.message}</p>
        </div>
      )}
    </div>
  );
};

export default EmotionPanel;
