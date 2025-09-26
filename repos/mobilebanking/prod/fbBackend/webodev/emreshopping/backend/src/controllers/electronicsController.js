const electronicsService = require('../services/electronicsService');

class ElectronicsController {
  getAllElectronics(req, res) {
    try {
      const electronics = electronicsService.getAllElectronics();
      res.json(electronics);
    } catch (error) {
      console.error('Electronics controller error:', error.message);
      res.status(500).json({ error: 'Elektronik verileri alınamadı.' });
    }
  }

  getElectronicById(req, res) {
    try {
      const id = parseInt(req.params.id);
      const electronic = electronicsService.getElectronicById(id);
      
      if (!electronic) {
        return res.status(404).json({ error: 'Elektronik ürün bulunamadı.' });
      }
      
      res.json(electronic);
    } catch (error) {
      console.error('Electronics controller error:', error.message);
      res.status(500).json({ error: 'Elektronik verisi alınamadı.' });
    }
  }
}

module.exports = new ElectronicsController(); 