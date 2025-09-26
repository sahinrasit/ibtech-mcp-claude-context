const recommendationsService = require('../services/recommendationsService');

class RecommendationsController {
  getAllRecommendations(req, res) {
    try {
      const recommendations = recommendationsService.getAllRecommendations();
      res.json(recommendations);
    } catch (error) {
      console.error('Recommendations controller error:', error.message);
      res.status(500).json({ error: 'Öneri verileri alınamadı.' });
    }
  }

  getRecommendationById(req, res) {
    try {
      const id = parseInt(req.params.id);
      const recommendation = recommendationsService.getRecommendationById(id);
      
      if (!recommendation) {
        return res.status(404).json({ error: 'Öneri bulunamadı.' });
      }
      
      res.json(recommendation);
    } catch (error) {
      console.error('Recommendations controller error:', error.message);
      res.status(500).json({ error: 'Öneri verisi alınamadı.' });
    }
  }
}

module.exports = new RecommendationsController(); 