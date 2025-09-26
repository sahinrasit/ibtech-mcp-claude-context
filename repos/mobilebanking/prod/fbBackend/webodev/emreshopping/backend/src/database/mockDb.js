const config = require('../config/config');

// Mock veritabanı
class MockDatabase {
  constructor() {
    if (MockDatabase.instance) {
      return MockDatabase.instance;
    }
    
    // Mock veri depoları
    this.tables = {
      campaigns: [
        { id: 1, title: "Elektronik Fırsatları", url: "/campaign1", image: "elektronik.jpeg" },
        { id: 2, title: "Alışverişe Başla", url: "/campaign2", image: "aliverise-basla.jpeg" },
        { id: 3, title: "HepsiPay Avantajları", url: "/campaign3", image: "hepsipay.jpeg" },
        { id: 4, title: "HepsiPay Kampanyası", url: "/campaign4", image: "hepsipay1.jpeg" },
        { id: 5, title: "Karaca Ürünleri", url: "/campaign5", image: "karaca.jpeg" },
        { id: 6, title: "Klima ve Soğutucular", url: "/campaign6", image: "klima-sogutucu.jpeg" },
        { id: 7, title: "Sevilen Ürünler", url: "/campaign7", image: "sevilen-urunler.jpeg" },
        { id: 8, title: "Kağıt Ürünleri", url: "/campaign8", image: "kagit-urunler.jpeg" }
      ],
      slider: [
        { id: 1, title: "Slider 1", image: "elektronik.jpeg" },
        { id: 2, title: "Slider 2", image: "aliverise-basla.jpeg" },
        { id: 3, title: "Slider 3", image: "hepsipay.jpeg" },
        { id: 4, title: "Slider 4", image: "hepsipay1.jpeg" }
      ],
      electronics: [
        { id: 1, name: "Laptop", price: 12999.99, image: "laptop.jpg", url: "/electronics/laptop" },
        { id: 2, name: "Telefon", price: 9999.99, image: "telefon.jpg", url: "/electronics/telefon" },
        { id: 3, name: "Tablet", price: 5999.99, image: "tablet.jpg", url: "/electronics/tablet" }
      ],
      recommendations: [
        { id: 1, name: "Akıllı Saat", price: 2499.99, rating: 4, image: "akilli-saat.jpg", url: "/product/1" },
        { id: 2, name: "Bluetooth Kulaklık", price: 899.99, rating: 5, image: "bluetooth-kulaklik.jpg", url: "/product/2" },
        { id: 3, name: "Powerbank", price: 349.99, rating: 3, image: "powerbank.jpg", url: "/product/3" },
        { id: 4, name: "Mouse", price: 199.99, rating: 4, image: "mouse.jpg", url: "/product/4" },
        { id: 5, name: "Klavye", price: 459.99, rating: 5, image: "klavye.jpg", url: "/product/5" }
      ]
    };
    
    // Singleton instance
    MockDatabase.instance = this;
    console.log('✅ Mock veritabanı bağlantısı başarılı');
  }

  // Mock prepare metodu
  prepare(query) {
    const getTableName = (query) => {
      // Basit bir regex ile tablo adını alalım
      const match = query.match(/FROM\s+(\w+)/i);
      return match ? match[1] : null;
    };

    return {
      all: () => {
        const tableName = getTableName(query);
        if (!tableName || !this.tables[tableName]) {
          throw new Error(`Tablo bulunamadı: ${tableName}`);
        }
        return this.tables[tableName];
      },
      get: (id) => {
        const tableName = getTableName(query);
        if (!tableName || !this.tables[tableName]) {
          throw new Error(`Tablo bulunamadı: ${tableName}`);
        }
        return this.tables[tableName].find(item => item.id === id);
      },
      run: (...args) => {
        return { changes: 1, lastInsertRowid: Math.floor(Math.random() * 1000) + 1 };
      }
    };
  }

  getInstance() {
    return this;
  }

  close() {
    console.log('✅ Mock veritabanı bağlantısı kapatıldı');
  }
}

module.exports = new MockDatabase(); 