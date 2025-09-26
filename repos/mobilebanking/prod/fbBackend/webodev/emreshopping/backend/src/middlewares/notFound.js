const notFound = (req, res, next) => {
  const error = new Error(`Route bulunamadı - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = notFound; 