const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = 16666;

app.use(cors());
app.use(express.json());

// 🔥 Görselleri public klasörden servis et
app.use('/images', express.static('public/images'));

// 🔌 Veritabanı bağlantısı
const db = new Database("./data/database.db", { verbose: console.log });

// 🔁 Kampanyalar API
app.get("/api/campaigns", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM campaigns").all();
    
    console.log("🟡 Veritabanından gelen orijinal kampanyalar:", rows);

    const updatedRows = rows.map((campaign) => ({
      ...campaign,
      image: `http://localhost:${PORT}/images/${campaign.image}`
    }));

    console.log("✅ Güncellenen kampanyalar:", updatedRows);
    res.json(updatedRows);
  } catch (err) {
    console.error("Veritabanı hatası:", err.message);
    return res.status(500).json({ error: err.message });
  }
});


// 🔁 Slider API
app.get("/api/slider", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM slider").all();
    // image alanını tam URL haline getiriyoruz
    const updatedRows = rows.map((item) => ({
      ...item,
      image: `http://localhost:${PORT}/images/${item.image}`
    }));
    res.json(updatedRows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 🔁 Elektronik API
app.get("/api/electronics", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM electronics").all();
    const updatedRows = rows.map((item) => ({
      ...item,
      image: `http://localhost:${PORT}/images/${item.image}`
    }));
    res.json(updatedRows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 🔁 Öneriler API
app.get("/api/recommendations", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM recommendations").all();
    const updatedRows = rows.map((item) => ({
      ...item,
      image: `http://localhost:${PORT}/images/${item.image}`
    }));
    res.json(updatedRows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 🎯 Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`✅ Backend server is running at http://localhost:${PORT}`);
});