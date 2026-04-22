import client from './client';

/**
 * Transcribe audio using the backend endpoint.
 * @param {Blob} audioBlob 
 * @returns {Promise<Object>}
 */
export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  
  const response = await client.post('/api/voice/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Convert text to speech. Returns audio URL for direct use in <audio> tags.
 * @param {string} text 
 * @param {string} [language='en']
 * @returns {string}
 */
export const speakText = (text, language = 'en') => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const params = new URLSearchParams({ text, language });
  return `${baseUrl}/api/voice/speak?${params.toString()}`;
};
