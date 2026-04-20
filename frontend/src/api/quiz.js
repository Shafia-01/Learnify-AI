import client from './client';

/**
 * Generate a quiz for a user on a topic.
 * Backend endpoint: POST /api/quiz/generate
 * GenerateRequest schema: { user_id, n, topic }
 * @param {string} userId
 * @param {string} topic
 * @param {number} n - number of questions
 * @returns {Promise<Array>}
 */
export const generateQuiz = async (userId, topic = 'overall', n = 5) => {
  const uid = userId || localStorage.getItem('user_id') || 'default';
  const response = await client.post('/api/quiz/generate', {
    user_id: uid,
    topic,
    n,
  });
  return response.data;
};

/**
 * Submit a quiz answer.
 * Backend endpoint: POST /api/quiz/submit
 * SubmitRequest schema: { user_id, question_id, user_answer, topic }
 * @param {string} questionId
 * @param {string} answer
 * @param {string} [topic]
 * @returns {Promise<Object>}
 */
export const submitAnswer = async (questionId, answer, topic = 'overall') => {
  const user_id = localStorage.getItem('user_id') || 'default';
  const response = await client.post('/api/quiz/submit', {
    user_id,
    question_id: questionId,
    user_answer: answer,
    topic,
  });
  return response.data;
};
