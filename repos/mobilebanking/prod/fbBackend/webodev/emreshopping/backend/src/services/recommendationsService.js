const recommendationsRepository = require('../models/recommendationsRepository');
const imageService = require('./imageService');

class RecommendationsService {
  getAllRecommendations() {
    try {
      const recommendations = recommendationsRepository.getAll();
      return imageService.addImageUrls(recommendations);
    } catch (error) {
      console.error('Error getting recommendations:', error.message);
      throw error;
    }
  }

  getRecommendationById(id) {
    try {
      const recommendation = recommendationsRepository.getById(id);
      return recommendation ? imageService.addImageUrl(recommendation) : null;
    } catch (error) {
      console.error(`Error getting recommendation by id ${id}:`, error.message);
      throw error;
    }
  }
}

module.exports = new RecommendationsService(); 