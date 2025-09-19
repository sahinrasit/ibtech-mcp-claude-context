const dbConnection = require('../database/db');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = dbConnection.getInstance();
  }

  getAll() {
    try {
      return this.db.prepare(`SELECT * FROM ${this.tableName}`).all();
    } catch (error) {
      console.error(`Error getting all from ${this.tableName}:`, error.message);
      throw error;
    }
  }
  
  getById(id) {
    try {
      return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    } catch (error) {
      console.error(`Error getting by id from ${this.tableName}:`, error.message);
      throw error;
    }
  }
  
  create(data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      
      const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      const info = this.db.prepare(query).run(...values);
      
      return { id: info.lastInsertRowid, ...data };
    } catch (error) {
      console.error(`Error creating in ${this.tableName}:`, error.message);
      throw error;
    }
  }
  
  update(id, data) {
    try {
      const keys = Object.keys(data);
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];
      
      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const info = this.db.prepare(query).run(...values);
      
      return info.changes > 0;
    } catch (error) {
      console.error(`Error updating in ${this.tableName}:`, error.message);
      throw error;
    }
  }
  
  delete(id) {
    try {
      const info = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
      return info.changes > 0;
    } catch (error) {
      console.error(`Error deleting from ${this.tableName}:`, error.message);
      throw error;
    }
  }
}

module.exports = BaseRepository; 