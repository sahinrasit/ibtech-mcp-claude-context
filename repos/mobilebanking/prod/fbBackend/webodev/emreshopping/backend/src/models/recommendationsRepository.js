const BaseRepository = require('./baseRepository');

class RecommendationsRepository extends BaseRepository {
  constructor() {
    super('recommendations');
  }
}

module.exports = new RecommendationsRepository(); 