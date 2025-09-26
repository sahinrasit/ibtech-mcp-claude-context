const { sequelize, Slider, Product } = require('../models');

async function seed() {
  await sequelize.sync({ force: true });

  // Slider verileri
  for (let i = 1; i <= 10; i++) {
    await Slider.create({
      title: `Slider Başlık ${i}`,
      description: `Slider açıklama ${i}`,
      imageUrl: `https://picsum.photos/seed/slider${i}/800/300`,
      link: `/campaigns/${i}`
    });
  }

  // Elektronik ürünler
  for (let i = 1; i <= 3; i++) {
    await Product.create({
      name: `Elektronik Ürün ${i}`,
      price: 1000 * i,
      description: `Elektronik ürün açıklama ${i}`,
      imageUrl: `https://picsum.photos/seed/electronics${i}/400/400`,
      rating: 4 + (i % 2),
      reviewCount: 10 * i,
      category: 'electronics'
    });
  }

  // Öneri ürünler
  for (let i = 1; i <= 5; i++) {
    await Product.create({
      name: `Öneri Ürün ${i}`,
      price: 500 * i,
      description: `Öneri ürün açıklama ${i}`,
      imageUrl: `https://picsum.photos/seed/recommend${i}/400/400`,
      rating: 3 + (i % 3),
      reviewCount: 5 * i,
      category: 'other'
    });
  }

  console.log('Seed işlemi tamamlandı!');
  process.exit();
}

seed(); 