const express = require('express');
const sliderController = require('../controllers/sliderController');

const router = express.Router();

router.get('/', sliderController.getAllSlides);
router.get('/:id', sliderController.getSlideById);

module.exports = router; 