const express = require("express");
const { getApiStatus } = require("../controllers/indexController");

const router = express.Router();

router.get("/health", getApiStatus);

module.exports = router;