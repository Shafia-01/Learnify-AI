import client from './client';

/**
 * Get user profile info and stats.
 * @returns {Promise<Object>}
 */
export const getProfile = async () => {
  const response = await client.get('/api/gamification/profile');
  return response.data;
};

/**
 * Get leaderboard rankings.
 * @returns {Promise<Object>}
 */
export const getLeaderboard = async () => {
  const response = await client.get('/api/gamification/leaderboard');
  return response.data;
};
