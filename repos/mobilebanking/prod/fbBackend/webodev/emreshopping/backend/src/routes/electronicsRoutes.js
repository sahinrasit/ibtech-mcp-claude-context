const express = require('express');
const electronicsController = require('../controllers/electronicsController');

const router = express.Router();

router.get('/', electronicsController.getAllElectronics);
router.get('/:id', electronicsController.getElectronicById);

module.exports = router; 