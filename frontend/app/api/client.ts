import axios from 'axios';

// You can use environment variable or hardcode for now
const BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add interceptors for auth, logging, error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can customize error handling here
    return Promise.reject(error);
  }
);

export default apiClient; 