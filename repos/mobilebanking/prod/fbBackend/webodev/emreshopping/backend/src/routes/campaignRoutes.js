const express = require('express');
const campaignController = require('../controllers/campaignController');

const router = express.Router();

router.get('/', campaignController.getAllCampaigns);
router.get('/:id', campaignController.getCampaignById);

module.exports = router; 