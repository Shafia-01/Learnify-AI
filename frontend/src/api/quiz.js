import client from './client';

/**
 * Get a quiz on a topic.
 * @param {string} topic 
 * @returns {Promise<Object>}
 */
export const getQuiz = async (topic) => {
  const response = await client.get(`/api/quiz?topic=${encodeURIComponent(topic)}`);
  return response.data;
};

/**
 * Submit quiz answer.
 * @param {string} questionId 
 * @param {string} answer 
 * @returns {Promise<Object>}
 */
export const submitAnswer = async (questionId, answer) => {
  const response = await client.post('/api/quiz/submit', { questionId, answer });
  return response.data;
};
