import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://ticket.di.uz/api' : 'http://localhost:5000/api');
const API_BASE_URL = rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL.replace(/\/$/, '')}/api`;

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

// Check ticket status by ticket number (#4)
export const checkTicketStatus = (ticket) => {
  return api.get(`/problems/check/${ticket}`);
};

export default api;
