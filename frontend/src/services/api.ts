import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Pre-configured Axios instance for API calls.
 * Automatically attaches the JWT token from localStorage if available.
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- API Wrappers ---

export const userApi = {
  updateProfile: async (data: { username?: string; dark_mode?: boolean }) => {
    const res = await api.put('/users/me', data);
    return res.data;
  }
};

export const reviewApi = {
  getAnalytics: async () => {
    const res = await api.get('/analytics');
    return res.data;
  },
  
  getHistory: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    severity?: string;
    category?: string;
    review_type?: string;
  }) => {
    const res = await api.get('/reviews', { params });
    return res.data;
  },

  getReview: async (id: number) => {
    const res = await api.get(`/reviews/${id}`);
    return res.data;
  }
};
