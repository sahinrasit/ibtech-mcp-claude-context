const config = require('../config/config');

class ImageService {
  addImageUrls(items) {
    if (!items || !Array.isArray(items)) {
      return [];
    }
    
    return items.map(item => ({
      ...item,
      image: `${config.imageBaseUrl}/${item.image}`
    }));
  }

  addImageUrl(item) {
    if (!item || !item.image) {
      return item;
    }
    
    return {
      ...item,
      image: `${config.imageBaseUrl}/${item.image}`
    };
  }
}

module.exports = new ImageService(); 