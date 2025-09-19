const electronicsRepository = require('../models/electronicsRepository');
const imageService = require('./imageService');

class ElectronicsService {
  getAllElectronics() {
    try {
      const electronics = electronicsRepository.getAll();
      return imageService.addImageUrls(electronics);
    } catch (error) {
      console.error('Error getting electronics:', error.message);
      throw error;
    }
  }

  getElectronicById(id) {
    try {
      const electronic = electronicsRepository.getById(id);
      return electronic ? imageService.addImageUrl(electronic) : null;
    } catch (error) {
      console.error(`Error getting electronic by id ${id}:`, error.message);
      throw error;
    }
  }
}

module.exports = new ElectronicsService(); 