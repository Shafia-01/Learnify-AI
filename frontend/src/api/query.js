import client from './client';

/**
 * Ask a question to the system.
 * @param {string} query 
 * @returns {Promise<Object>}
 */
export const askQuestion = async (query) => {
  const response = await client.post('/api/query', { query });
  return response.data;
};

/**
 * Get learning path based on topic.
 * @param {string} topic 
 * @returns {Promise<Object>}
 */
export const getLearningPath = async (topic) => {
  const response = await client.get(`/api/learning-path?topic=${encodeURIComponent(topic)}`);
  return response.data;
};

/**
 * Get knowledge graph data based on query.
 * @param {string} query 
 * @returns {Promise<Object>}
 */
export const getKnowledgeGraph = async (query) => {
  const response = await client.get(`/api/knowledge-graph?query=${encodeURIComponent(query)}`);
  return response.data;
};
