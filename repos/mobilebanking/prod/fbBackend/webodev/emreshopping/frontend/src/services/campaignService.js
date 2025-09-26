import api from './api';

const campaignService = {
  getAllCampaigns: async () => {
    try {
      return await api.get('/campaigns');
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  },

  getCampaignById: async (id) => {
    try {
      return await api.get(`/campaigns/${id}`);
    } catch (error) {
      console.error(`Error fetching campaign with id ${id}:`, error);
      throw error;
    }
  }
};

export default campaignService; 