import { useState, useRef } from 'react';
import { transcribeAudio } from '../api/voice';

const VoiceButton = ({ onTranscription }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Let the browser choose the best supported mimeType
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current);
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size < 500) return;

        try {
          const res = await transcribeAudio(audioBlob);
          if (res && res.text) {
            onTranscription(res.text);
          }
        } catch (error) {
          console.error("Transcription failed", error);
        }
        
        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied or error", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      onClick={toggleRecording}
      className={`p-3 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110 shadow-[0_0_15px_rgba(239,68,68,0.7)]' : 'bg-gray-700 hover:bg-gray-600 border border-gray-600' }`}
      title={isRecording ? "Click to stop recording" : "Click to speak"}
    >
      <span className="text-xl">🎙️</span>
    </button>
  );
};

export default VoiceButton;
