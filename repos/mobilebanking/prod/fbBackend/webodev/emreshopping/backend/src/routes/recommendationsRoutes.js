const express = require('express');
const recommendationsController = require('../controllers/recommendationsController');

const router = express.Router();

router.get('/', recommendationsController.getAllRecommendations);
router.get('/:id', recommendationsController.getRecommendationById);

module.exports = router; 