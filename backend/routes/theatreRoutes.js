const express = require('express');
const router = express.Router();
const { getTheatres } = require('../controllers/theatreController');

router.get('/theatres', getTheatres);

module.exports = router;