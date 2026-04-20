import client from './client';

/**
 * Upload a document file for ingestion.
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post('/api/ingest/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};


