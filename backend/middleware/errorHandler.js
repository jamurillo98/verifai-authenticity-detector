function errorHandler(err, req, res, next) {
  console.error(err.stack || err);

  const status =
    err.status ||
    err.statusCode ||
    (err.name === "MulterError" ? 400 : undefined) ||
    500;

  res.status(status).json({
    success: false,
    message: err.message || "Internal server error"
  });
}

module.exports = errorHandler;
