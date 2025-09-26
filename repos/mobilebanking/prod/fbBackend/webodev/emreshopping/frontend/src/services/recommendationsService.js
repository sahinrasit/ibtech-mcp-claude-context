import api from './api';

const recommendationsService = {
  getAllRecommendations: async () => {
    try {
      return await api.get('/recommendations');
    } catch (error) {
      console.error('Error fetching recommendations data:', error);
      throw error;
    }
  },

  getRecommendationById: async (id) => {
    try {
      return await api.get(`/recommendations/${id}`);
    } catch (error) {
      console.error(`Error fetching recommendation with id ${id}:`, error);
      throw error;
    }
  }
};

export default recommendationsService; 