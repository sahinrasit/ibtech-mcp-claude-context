const sliderRepository = require('../models/sliderRepository');
const imageService = require('./imageService');

class SliderService {
  getAllSlides() {
    try {
      const slides = sliderRepository.getAll();
      return imageService.addImageUrls(slides);
    } catch (error) {
      console.error('Error getting slides:', error.message);
      throw error;
    }
  }

  getSlideById(id) {
    try {
      const slide = sliderRepository.getById(id);
      return slide ? imageService.addImageUrl(slide) : null;
    } catch (error) {
      console.error(`Error getting slide by id ${id}:`, error.message);
      throw error;
    }
  }
}

module.exports = new SliderService(); 