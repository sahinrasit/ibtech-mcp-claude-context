require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const { sequelize } = require('./models');

// Express uygulamasını başlat
const app = express();
const PORT = config.port;

// Middleware'ler
app.use(cors(config.corsOptions));
app.use(express.json());

// Statik dosyaları servis et
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// API rotaları
app.use('/api', apiRoutes);

// Hata yakalama middleware'leri
app.use(notFound);
app.use(errorHandler);

// Veritabanı senkronizasyonu ve sunucuyu başlatma
async function startServer() {
  try {
    await sequelize.sync();
    console.log('Database synchronized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
}

startServer(); 