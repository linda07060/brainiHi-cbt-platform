import axios from 'axios';

// Create an axios instance with your API base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001',
  withCredentials: true, // Only needed if your backend uses httpOnly cookies for auth
});

// Add a request interceptor to automatically attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('auth');
      if (auth) {
        const { token } = JSON.parse(auth);
        if (token) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: Add a response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Example: Redirect to login if 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Optionally clear user/session and redirect
      localStorage.removeItem('auth');
      // window.location.href = "/login"; // Uncomment to force redirect
    }
    return Promise.reject(error);
  }
);

export default api;