import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:16666/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 saniye timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // İstek başlamadan önce yapılacak işlemler
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Sunucudan hata yanıtı
      console.error('API Error:', error.response.data);
      return Promise.reject(new Error(error.response.data.message || 'Sunucu hatası'));
    } else if (error.request) {
      // İstek yapıldı ama yanıt alınamadı
      console.error('Network Error:', error.request);
      return Promise.reject(new Error('Sunucuya bağlanılamadı'));
    } else {
      // İstek oluşturulurken hata oluştu
      console.error('Request Error:', error.message);
      return Promise.reject(new Error('İstek oluşturulamadı'));
    }
  }
);

export default api; 