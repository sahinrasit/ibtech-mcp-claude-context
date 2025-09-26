import api from './api';

const electronicsService = {
  getAllElectronics: async () => {
    try {
      return await api.get('/electronics');
    } catch (error) {
      console.error('Error fetching electronics data:', error);
      throw error;
    }
  },

  getElectronicById: async (id) => {
    try {
      return await api.get(`/electronics/${id}`);
    } catch (error) {
      console.error(`Error fetching electronic with id ${id}:`, error);
      throw error;
    }
  }
};

export default electronicsService; 