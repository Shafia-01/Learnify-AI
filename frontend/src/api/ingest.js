import client from './client';

/**
 * Upload a document file for ingestion.
 * @param {File} file 
 * @param {string} [subject]
 * @returns {Promise<Object>}
 */
export const uploadFile = async (file, subject = "") => {
  const formData = new FormData();
  formData.append('file', file);
  if (subject) {
    formData.append('subject', subject);
  }
  const response = await client.post('/api/ingest/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};


