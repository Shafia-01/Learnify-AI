import client from './client';

/**
 * Ask a question to the system.
 * @param {string} query 
 * @returns {Promise<Object>}
 */
export const askQuestion = async (query, level = 'intermediate', language = 'English') => {
  const user_id = localStorage.getItem('user_id') || 'default';
  const response = await client.post('/api/query/ask', {
    question: query,
    user_id,
    level,
    language,
  });
  return response.data;
};

/**
 * Get learning path based on topic.
 * @param {string} topic 
 * @returns {Promise<Object>}
 */
export const getLearningPath = async (userId = 'default') => {
  const response = await client.get(`/api/query/learning-path/${encodeURIComponent(userId)}`);
  return response.data;
};

/**
 * Get knowledge graph data based on query.
 * @param {string} query 
 * @returns {Promise<Object>}
 */
export const getKnowledgeGraph = async (userId = 'default') => {
  const response = await client.get(`/api/query/knowledge-graph/${encodeURIComponent(userId)}`);
  return response.data;
};
