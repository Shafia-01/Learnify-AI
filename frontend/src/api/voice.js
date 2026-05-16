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
 * Convert text to speech using a GET request.
 * For short text, returns a direct URL for <audio> tags.
 * For long text, fetches the audio as a blob and creates an object URL.
 * @param {string} text 
 * @param {string} [language='en']
 * @returns {string} URL to the audio
 */
export const speakText = (text, language = 'en') => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const params = new URLSearchParams({ text, language });
  return `${baseUrl}/api/voice/speak?${params.toString()}`;
};

/**
 * Fetch TTS audio as a blob URL — works for long text that might exceed
 * URL length limits when using the GET endpoint directly.
 * Uses a GET request with query parameters which the backend supports.
 * @param {string} text 
 * @param {string} [language='en']
 * @returns {Promise<string>} Object URL for the audio blob
 */
export const speakTextFetch = async (text, language = 'en') => {
  try {
    const response = await client.post('/api/voice/speak', { text, language }, {
      responseType: 'blob'
    });
    return URL.createObjectURL(response.data);
  } catch (error) {
    console.error('TTS request failed:', error);
    throw error;
  }
};
