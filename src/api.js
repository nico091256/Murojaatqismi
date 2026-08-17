import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check to test backend connection
export const checkHealth = async () => {
  try {
    const res = await api.get('/health');
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// Create a new problem ticket
export const createProblem = (data) => {
  return api.post('/problems', data);
};

export default api;
