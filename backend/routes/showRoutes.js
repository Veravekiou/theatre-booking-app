const express = require('express');
const router = express.Router();
const { getShows } = require('../controllers/showController');

router.get('/shows', getShows);

module.exports = router;