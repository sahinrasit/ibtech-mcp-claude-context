const errorHandler = (err, req, res, next) => {
  console.error('❌ Sunucu Hatası:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Sunucu hatası oluştu';
  
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message
  });
};

module.exports = errorHandler; 