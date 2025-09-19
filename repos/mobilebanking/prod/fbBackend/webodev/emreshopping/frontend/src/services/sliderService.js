import api from './api';

const sliderService = {
  getAllSlides: async () => {
    try {
      return await api.get('/slider');
    } catch (error) {
      console.error('Error fetching slider data:', error);
      throw error;
    }
  },

  getSlideById: async (id) => {
    try {
      return await api.get(`/slider/${id}`);
    } catch (error) {
      console.error(`Error fetching slide with id ${id}:`, error);
      throw error;
    }
  }
};

export default sliderService; 