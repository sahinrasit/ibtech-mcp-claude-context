// backend/init_db.js
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// data dizininin varlığını kontrol et
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new Database("./data/database.db");

// Tabloları temizle
db.exec("DROP TABLE IF EXISTS campaigns");
db.exec("DROP TABLE IF EXISTS slider");
db.exec("DROP TABLE IF EXISTS electronics");
db.exec("DROP TABLE IF EXISTS recommendations");

// Tabloları oluştur
db.exec(`CREATE TABLE campaigns (id INTEGER PRIMARY KEY, title TEXT, url TEXT, image TEXT)`);
db.exec(`CREATE TABLE slider (id INTEGER PRIMARY KEY, title TEXT, image TEXT)`);
db.exec(`CREATE TABLE electronics (id INTEGER PRIMARY KEY, name TEXT, price REAL, url TEXT)`);
db.exec(`CREATE TABLE recommendations (id INTEGER PRIMARY KEY, name TEXT, price REAL, rating INTEGER, url TEXT)`);

// Mevcut görsel dosyaları
const campaignImages = [
  "elektronik.jpeg",
  "aliverise-basla.jpeg", 
  "hepsipay.jpeg", 
  "hepsipay1.jpeg", 
  "karaca.jpeg", 
  "klima-sogutucu.jpeg", 
  "sevilen-urunler.jpeg", 
  "kagit-urunler.jpeg"
];

const campaignTitles = [
  "Elektronik Fırsatları",
  "Alışverişe Başla",
  "HepsiPay Avantajları",
  "HepsiPay Kampanyası",
  "Karaca Ürünleri",
  "Klima ve Soğutucular",
  "Sevilen Ürünler",
  "Kağıt Ürünleri"
];

// Kampanya verileri ekle
const insertCampaign = db.prepare("INSERT INTO campaigns (title, url, image) VALUES (?, ?, ?)");
for (let i = 0; i < campaignImages.length; i++) {
  insertCampaign.run(campaignTitles[i], `/campaign${i+1}`, campaignImages[i]);
}

// Slider verileri ekle - Aynı görselleri farklı başlıklarla kullanabiliriz
const insertSlider = db.prepare("INSERT INTO slider (title, image) VALUES (?, ?)");
for (let i = 0; i < campaignImages.length; i++) {
  insertSlider.run(`Slider ${i+1}`, campaignImages[i]);
}

// Elektronik verileri ekle
const insertElectronics = db.prepare("INSERT INTO electronics (name, price, url) VALUES (?, ?, ?)");
insertElectronics.run("Laptop", 12999.99, "/electronics/laptop");
insertElectronics.run("Telefon", 9999.99, "/electronics/telefon");
insertElectronics.run("Tablet", 5999.99, "/electronics/tablet");

// Öneri verileri ekle
const insertRecommendations = db.prepare("INSERT INTO recommendations (name, price, rating, url) VALUES (?, ?, ?, ?)");
insertRecommendations.run("Akıllı Saat", 2499.99, 4, "/product/1");
insertRecommendations.run("Bluetooth Kulaklık", 899.99, 5, "/product/2");
insertRecommendations.run("Powerbank", 349.99, 3, "/product/3");
insertRecommendations.run("Mouse", 199.99, 4, "/product/4");
insertRecommendations.run("Klavye", 459.99, 5, "/product/5");

console.log("Veritabanı başarıyla oluşturuldu!");
db.close();
