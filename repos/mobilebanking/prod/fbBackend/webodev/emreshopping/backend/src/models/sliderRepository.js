const BaseRepository = require('./baseRepository');

class SliderRepository extends BaseRepository {
  constructor() {
    super('slider');
  }
}

module.exports = new SliderRepository(); 