import client from './client';

/**
 * Transcribe audio using the backend endpoint.
 * @param {Blob} audioBlob 
 * @returns {Promise<Object>}
 */
export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  
  const response = await client.post('/api/voice/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Convert text to speech. Returns audio blob URL.
 * @param {string} text 
 * @returns {Promise<string>}
 */
export const speakText = async (text) => {
  const response = await client.post('/api/voice/speak', { text }, {
    responseType: 'blob'
  });
  return URL.createObjectURL(response.data);
};
