const campaignService = require('../services/campaignService');

class CampaignController {
  getAllCampaigns(req, res) {
    try {
      const campaigns = campaignService.getAllCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error('Campaign controller error:', error.message);
      res.status(500).json({ error: 'Kampanya verileri alınamadı.' });
    }
  }

  getCampaignById(req, res) {
    try {
      const id = parseInt(req.params.id);
      const campaign = campaignService.getCampaignById(id);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Kampanya bulunamadı.' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Campaign controller error:', error.message);
      res.status(500).json({ error: 'Kampanya verisi alınamadı.' });
    }
  }
}

module.exports = new CampaignController(); 