const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { getHistory } = require('../controllers/historyController');

router.get('/', verifyToken, getHistory);

module.exports = router;
