function getApiStatus(req, res) {
  res.status(200).json({
    success: true,
    message: "Verifai API is ready."
  });
}

module.exports = {
  getApiStatus
};
