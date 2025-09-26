const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 16666,
  databasePath: process.env.DATABASE_PATH || './src/database/database.db',
  imageBaseUrl: process.env.IMAGE_BASE_URL || 'http://localhost:16666/images',
  corsOptions: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    optionsSuccessStatus: 200
  }
}; 