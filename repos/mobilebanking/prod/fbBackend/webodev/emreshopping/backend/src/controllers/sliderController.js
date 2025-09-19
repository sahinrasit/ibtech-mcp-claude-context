const sliderService = require('../services/sliderService');

class SliderController {
  getAllSlides(req, res) {
    try {
      const slides = sliderService.getAllSlides();
      res.json(slides);
    } catch (error) {
      console.error('Slider controller error:', error.message);
      res.status(500).json({ error: 'Slider verileri alınamadı.' });
    }
  }

  getSlideById(req, res) {
    try {
      const id = parseInt(req.params.id);
      const slide = sliderService.getSlideById(id);
      
      if (!slide) {
        return res.status(404).json({ error: 'Slider bulunamadı.' });
      }
      
      res.json(slide);
    } catch (error) {
      console.error('Slider controller error:', error.message);
      res.status(500).json({ error: 'Slider verisi alınamadı.' });
    }
  }
}

module.exports = new SliderController(); 