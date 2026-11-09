const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
    return 'https://ihb-inventory-api.onrender.com';
  }
  return process.env.REACT_APP_API_URL || 'https://ihb-inventory-api.onrender.com';
};

export const API_URL = getApiUrl();