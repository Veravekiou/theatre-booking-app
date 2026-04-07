const express = require('express');
const router = express.Router();
const { getShowtimes } = require('../controllers/showtimeController');

router.get('/showtimes', getShowtimes);

module.exports = router;