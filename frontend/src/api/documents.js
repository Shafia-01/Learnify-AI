import client from './client';

export const getDocuments = async () => {
  const response = await client.get('/api/documents');
  return response.data;
};

export const deleteDocument = async (subject, filename = null) => {
  const params = { subject };
  if (filename) {
    params.filename = filename;
  }
  const response = await client.delete('/api/documents', { params });
  return response.data;
};
