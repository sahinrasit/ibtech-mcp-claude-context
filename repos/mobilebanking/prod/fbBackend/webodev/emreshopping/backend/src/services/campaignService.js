const campaignRepository = require('../models/campaignRepository');
const imageService = require('./imageService');

class CampaignService {
  getAllCampaigns() {
    try {
      const campaigns = campaignRepository.getAll();
      return imageService.addImageUrls(campaigns);
    } catch (error) {
      console.error('Error getting campaigns:', error.message);
      throw error;
    }
  }

  getCampaignById(id) {
    try {
      const campaign = campaignRepository.getById(id);
      return campaign ? imageService.addImageUrl(campaign) : null;
    } catch (error) {
      console.error(`Error getting campaign by id ${id}:`, error.message);
      throw error;
    }
  }
}

module.exports = new CampaignService(); 