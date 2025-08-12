import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance with your backend URL
// Use your computer's IP address instead of localhost for physical device testing
const api = axios.create({
  baseURL: 'http://192.168.0.113:8000/api', // Your computer's actual IP address
  timeout: 5000, // Reduced timeout for faster failure detection
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Faster error handling
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('API request timed out, using fallback data');
      return Promise.reject(new Error('TIMEOUT'));
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      // You can add navigation logic here to redirect to login
    }
    return Promise.reject(error);
  }
);

export default api; 