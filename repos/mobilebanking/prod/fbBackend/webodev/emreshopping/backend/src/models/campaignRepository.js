const BaseRepository = require('./baseRepository');

class CampaignRepository extends BaseRepository {
  constructor() {
    super('campaigns');
  }
}

module.exports = new CampaignRepository(); 