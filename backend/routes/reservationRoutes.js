const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

const {
  createReservation,
  getUserReservations,
  updateReservation,
  cancelReservation
} = require('../controllers/reservationController');

router.post('/reservations', verifyToken, createReservation);
router.get('/user/reservations', verifyToken, getUserReservations);
router.put('/reservations/:id', verifyToken, updateReservation);
router.delete('/reservations/:id', verifyToken, cancelReservation);

module.exports = router;