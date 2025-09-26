const Database = require('better-sqlite3');
const config = require('../config/config');
const path = require('path');

// Singleton pattern for database connection
class DatabaseConnection {
  constructor() {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }
    
    try {
      this.db = new Database(config.databasePath, { verbose: console.log });
      console.log('✅ Database connection successful');
      DatabaseConnection.instance = this;
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      throw error;
    }
  }

  getInstance() {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }
}

module.exports = new DatabaseConnection(); 