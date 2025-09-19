const BaseRepository = require('./baseRepository');

class ElectronicsRepository extends BaseRepository {
  constructor() {
    super('electronics');
  }
}

module.exports = new ElectronicsRepository(); 