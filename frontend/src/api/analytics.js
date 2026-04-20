import client from './client';

/**
 * Get session statistics for a specific user.
 * Backend endpoint: GET /api/analytics/stats/{user_id}
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const getSessionStats = async (userId) => {
  const uid = userId || localStorage.getItem('user_id') || 'default';
  const response = await client.get(`/api/analytics/stats/${encodeURIComponent(uid)}`);
  return response.data;
};

/**
 * Log an analytics event.
 * Backend endpoint: POST /api/analytics/event
 * @param {Object} eventPayload - Must contain user_id, event_type, and optional metadata
 * @returns {Promise<Object>}
 */
export const logEvent = async (eventPayload) => {
  const response = await client.post('/api/analytics/event', eventPayload);
  return response.data;
};
