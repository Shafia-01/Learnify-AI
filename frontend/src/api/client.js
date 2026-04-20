import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

client.interceptors.request.use((config) => {
  const userId = localStorage.getItem('user_id');
  const token = localStorage.getItem('token');
  
  if (userId) {
    config.headers['user_id'] = userId;
  }
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default client;
