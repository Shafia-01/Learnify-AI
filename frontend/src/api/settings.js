import client from './client';

/**
 * Fetch the current backend configuration (privacy mode, LLM provider, etc).
 */
export const getSettingsStatus = async () => {
  const response = await client.get('/api/settings/status');
  return response.data;
};

/**
 * Fetch available LLM providers and their statuses (available/unavailable).
 */
export const getAvailableProviders = async () => {
  const response = await client.get('/api/settings/providers');
  return response.data;
};

/**
 * Update the active LLM provider and/or model.
 * @param {string} provider - The provider ID (e.g., 'gemini', 'groq', 'ollama').
 * @param {string} [model] - Optional model name override.
 */
export const switchProvider = async (provider, model) => {
  const response = await client.post('/api/settings/provider', { provider, model });
  return response.data;
};

/**
 * Toggle Privacy Mode on/off.
 * @param {boolean} enabled
 */
export const togglePrivacyMode = async (enabled) => {
  const response = await client.post('/api/settings/privacy', { enabled });
  return response.data;
};
