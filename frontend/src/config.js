// frontend/src/config.js
const getApiUrl = () => {
  // Check if running inside a Capacitor mobile app
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    return 'https://ihb-inventory-api.onrender.com/api';
  }
  // Fallback for local browser web development
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiUrl();