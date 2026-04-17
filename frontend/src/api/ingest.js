import client from './client';

/**
 * Upload a document file for ingestion.
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post('/api/ingest/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Ingest from a youtube URL.
 * @param {string} url 
 * @returns {Promise<Object>}
 */
export const uploadYoutube = async (url) => {
  const response = await client.post('/api/ingest/youtube', { url });
  return response.data;
};
