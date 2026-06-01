// Environment configuration for EventMarketers Mobile App

// export const BASE_URL = 'https://eventmarketersbackend.onrender.com';
// export const BASE_URL = 'http://192.168.1.26:3001'; // Machine IP Address
export const BASE_URL = 'http://127.0.0.1:3001'; // Use localhost since adb reverse forwards this to PC
export const API_CONFIG = {
  BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  VERSION: '1.0.0',
};
