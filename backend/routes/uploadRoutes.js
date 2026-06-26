const express = require('express');
const router = express.Router();
const multer = require('multer');
const { imageFileFilter, postUpload } = require('../controllers/uploadController');
const verifyToken = require('../middleware/verifyToken');

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter
});

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return verifyToken(req, res, next);
};

router.post('/', optionalAuth, upload.single('image'), postUpload);

module.exports = router;