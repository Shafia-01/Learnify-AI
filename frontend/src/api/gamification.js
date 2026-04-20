import client from './client';

/**
 * Get user profile info and stats.
 * Backend endpoint: GET /api/gamification/profile/{user_id}
 * @param {string} userId - The user's ID (required by the backend path param)
 * @returns {Promise<Object>}
 */
export const getProfile = async (userId) => {
  const uid = userId || localStorage.getItem('user_id') || 'default';
  const response = await client.get(`/api/gamification/profile/${encodeURIComponent(uid)}`);
  return response.data;
};

/**
 * Get leaderboard rankings.
 * Backend endpoint: GET /api/gamification/leaderboard
 * @returns {Promise<Array>}
 */
export const getLeaderboard = async () => {
  const response = await client.get('/api/gamification/leaderboard');
  return response.data;
};

/**
 * Award XP for an event.
 * Backend endpoint: POST /api/gamification/award/{user_id}
 * @param {string} userId
 * @param {string} eventType
 * @returns {Promise<Object>}
 */
export const awardXp = async (userId, eventType) => {
  const uid = userId || localStorage.getItem('user_id') || 'default';
  const response = await client.post(`/api/gamification/award/${encodeURIComponent(uid)}`, {
    event_type: eventType,
  });
  return response.data;
};
