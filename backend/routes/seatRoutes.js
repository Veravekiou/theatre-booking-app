const express = require('express');
const router = express.Router();
const { getSeatAvailability } = require('../controllers/seatController');

router.get('/seats', getSeatAvailability);

module.exports = router;
