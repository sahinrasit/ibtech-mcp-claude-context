const express = require('express');
const router = express.Router();
const { QuickLink, Slider, Product, VisitedProduct } = require('../models');
const campaignRoutes = require('./campaignRoutes');
const { Op } = require('sequelize');

// Kampanya rotalarını ekle
router.use('/campaigns', campaignRoutes);

// Quick Links API
router.get('/quick-links', async (req, res) => {
  try {
    const links = await QuickLink.findAll();
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Slider API
router.get('/slider', async (req, res) => {
  try {
    const slides = await Slider.findAll();
    res.json(slides);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Elektronik Fırsatlar API
router.get('/electronic-deals', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { category: 'electronics' },
      limit: 3,
      order: [['createdAt', 'DESC']]
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching electronic deals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sana Özel Öneriler API
router.get('/personal-recommendations', async (req, res) => {
  try {
    const products = await Product.findAll({
      limit: 5,
      order: [['rating', 'DESC']],
      where: {
        rating: {
          [Op.gt]: 0
        }
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching personal recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gezilen Ürünler API
router.get('/visited-products', async (req, res) => {
  try {
    const visitedProducts = await VisitedProduct.findAll({
      include: [{
        model: Product,
        required: true
      }],
      order: [['visitedAt', 'DESC']],
      limit: 5
    });
    res.json(visitedProducts);
  } catch (error) {
    console.error('Error fetching visited products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ürün Detay API
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Ürünü ziyaret edilenler listesine ekle
    await VisitedProduct.create({
      productId: product.id
    });
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 