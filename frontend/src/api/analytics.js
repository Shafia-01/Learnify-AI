import client from './client';

/**
 * Get session statistics.
 * @returns {Promise<Object>}
 */
export const getSessionStats = async () => {
  const response = await client.get('/api/analytics/session');
  return response.data;
};
