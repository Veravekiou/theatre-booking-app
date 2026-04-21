const pool = require('../config/db');
const {
  getEffectiveSeatState,
  normalizeSeatNumbers,
  calculateSeatPricing
} = require('../services/seatService');

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parseRequestedSeatNumbers = (seatNumbers) => {
  return normalizeSeatNumbers(seatNumbers);
};

const createReservation = async (req, res) => {
  let conn;
  try {
    const { showtime_id, quantity, seat_numbers } = req.body;
    const user_id = req.user.userId;
    const parsedShowtimeId = parsePositiveInteger(showtime_id);
    const parsedQuantity = parsePositiveInteger(quantity);
    const requestedSeatNumbers = parseRequestedSeatNumbers(seat_numbers);

    if (!parsedShowtimeId) {
      return res.status(400).json({
        message: 'showtime_id must be a positive integer'
      });
    }

    if (!parsedQuantity && requestedSeatNumbers.length === 0) {
      return res.status(400).json({
        message: 'Provide quantity or seat_numbers'
      });
    }

    if (
      requestedSeatNumbers.length > 0 &&
      parsedQuantity &&
      parsedQuantity !== requestedSeatNumbers.length
    ) {
      return res.status(400).json({
        message: 'quantity must match seat_numbers length'
      });
    }

    const effectiveQuantity =
      requestedSeatNumbers.length > 0 ? requestedSeatNumbers.length : parsedQuantity;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const showtime = await conn.query(
      `SELECT
         showtime_id,
         capacity,
         price,
         CASE
           WHEN TIMESTAMP(show_date, show_time) > NOW() THEN 1
           ELSE 0
         END AS is_future
       FROM showtimes
       WHERE showtime_id = ?
       FOR UPDATE`,
      [parsedShowtimeId]
    );

    if (showtime.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Showtime not found' });
    }

    if (Number(showtime[0].is_future) !== 1) {
      await conn.rollback();
      return res.status(400).json({ message: 'Cannot reserve seats for past showtimes' });
    }

    const capacity = Number(showtime[0].capacity || 0);

    const seatState = await getEffectiveSeatState(conn, parsedShowtimeId, capacity);
    const availableSeatSet = new Set(seatState.availableSeatNumbers);
    const validSeatSet = new Set(seatState.allSeatLabels);

    if (effectiveQuantity > seatState.availableSeatNumbers.length) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Not enough available seats',
        available_seats: seatState.availableSeatNumbers.length
      });
    }

    if (requestedSeatNumbers.length > 0) {
      const invalidSeats = requestedSeatNumbers.filter(
        (seatNumber) => !validSeatSet.has(seatNumber)
      );

      if (invalidSeats.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          message: 'Some selected seats are invalid',
          invalid_seats: invalidSeats
        });
      }

      const unavailableSeats = requestedSeatNumbers.filter(
        (seatNumber) => !availableSeatSet.has(seatNumber)
      );

      if (unavailableSeats.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          message: 'Some selected seats are already reserved',
          unavailable_seats: unavailableSeats
        });
      }
    }

    const result = await conn.query(
      'INSERT INTO reservations (user_id, showtime_id, quantity, status) VALUES (?, ?, ?, ?)',
      [user_id, parsedShowtimeId, effectiveQuantity, 'active']
    );

    const reservationId = Number(result.insertId);

    if (requestedSeatNumbers.length > 0) {
      const placeholders = requestedSeatNumbers.map(() => '(?, ?, ?)').join(', ');
      const values = [];

      for (const seatNumber of requestedSeatNumbers) {
        values.push(reservationId, parsedShowtimeId, seatNumber);
      }

      await conn.query(
        `INSERT INTO reservation_seats (reservation_id, showtime_id, seat_number)
         VALUES ${placeholders}`,
        values
      );
    }

    const pricing = calculateSeatPricing(
      showtime[0].price,
      requestedSeatNumbers,
      effectiveQuantity
    );

    await conn.commit();

    res.status(201).json({
      message: 'Reservation created successfully',
      reservationId,
      quantity: effectiveQuantity,
      seat_numbers: requestedSeatNumbers,
      base_price: pricing.basePrice,
      vip_price_multiplier: pricing.vipPriceMultiplier,
      vip_seat_count: pricing.vipSeatCount,
      total_price: pricing.totalPrice,
      remaining_seats: seatState.availableSeatNumbers.length - effectiveQuantity
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        // Ignore rollback errors to keep the original error response.
      }
    }

    if (error && Number(error.errno) === 1062) {
      return res.status(409).json({
        message: 'Some selected seats were just reserved by another user'
      });
    }

    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const getUserReservations = async (req, res) => {
  let conn;
  try {
    const user_id = req.user.userId;
    conn = await pool.getConnection();

    const reservations = await conn.query(
      `SELECT
         r.reservation_id,
         r.showtime_id,
         r.quantity,
         r.status,
         r.created_at,
         s.title AS show_title,
         t.name AS theatre_name,
         st.show_date,
         st.show_time,
         st.hall,
         st.price,
         GROUP_CONCAT(rs.seat_number ORDER BY rs.seat_number SEPARATOR ',') AS seat_numbers,
         CASE
           WHEN r.status = 'active' AND TIMESTAMP(st.show_date, st.show_time) > NOW() THEN 1
           ELSE 0
         END AS can_modify
       FROM reservations r
       JOIN showtimes st ON r.showtime_id = st.showtime_id
       JOIN shows s ON st.show_id = s.show_id
       JOIN theatres t ON s.theatre_id = t.theatre_id
       LEFT JOIN reservation_seats rs ON r.reservation_id = rs.reservation_id
       WHERE r.user_id = ?
       GROUP BY
         r.reservation_id,
         r.showtime_id,
         r.quantity,
         r.status,
         r.created_at,
         s.title,
         t.name,
         st.show_date,
         st.show_time,
         st.hall,
         st.price
       ORDER BY r.created_at DESC`,
      [user_id]
    );

    const normalizedReservations = reservations.map((reservation) => {
      const seatNumbers = reservation.seat_numbers
        ? String(reservation.seat_numbers)
            .split(',')
            .filter((seatNumber) => seatNumber.length > 0)
        : [];

      const pricing = calculateSeatPricing(
        reservation.price,
        seatNumbers,
        reservation.quantity
      );

      // Format show_date as YYYY-MM-DD string
      const showDate = reservation.show_date instanceof Date
        ? reservation.show_date.toISOString().split('T')[0]
        : reservation.show_date;

      return {
        ...reservation,
        show_date: showDate,
        vip_price_multiplier: pricing.vipPriceMultiplier,
        vip_seat_count: pricing.vipSeatCount,
        total_price: pricing.totalPrice,
        seat_numbers: seatNumbers,
        has_seat_selection: seatNumbers.length > 0 ? 1 : 0
      };
    });

    res.json(normalizedReservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const updateReservation = async (req, res) => {
  let conn;
  try {
    const reservationId = req.params.id;
    const user_id = req.user.userId;
    const { quantity } = req.body;
    const parsedQuantity = parsePositiveInteger(quantity);

    if (!parsedQuantity) {
      return res.status(400).json({ message: 'quantity must be a positive integer' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const reservation = await conn.query(
      `SELECT
         r.reservation_id,
         r.showtime_id,
         r.status,
         CASE
           WHEN TIMESTAMP(st.show_date, st.show_time) > NOW() THEN 1
           ELSE 0
         END AS is_future
       FROM reservations r
       JOIN showtimes st ON r.showtime_id = st.showtime_id
       WHERE r.reservation_id = ? AND r.user_id = ?
       FOR UPDATE`,
      [reservationId, user_id]
    );

    if (reservation.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (reservation[0].status !== 'active') {
      await conn.rollback();
      return res.status(400).json({ message: 'Only active reservations can be updated' });
    }

    if (Number(reservation[0].is_future) !== 1) {
      await conn.rollback();
      return res.status(400).json({ message: 'Only future reservations can be updated' });
    }

    const seatRows = await conn.query(
      `SELECT COUNT(*) AS seat_count
       FROM reservation_seats
       WHERE reservation_id = ?
       FOR UPDATE`,
      [reservationId]
    );

    if (Number(seatRows[0].seat_count || 0) > 0) {
      await conn.rollback();
      return res.status(400).json({
        message: 'This reservation has selected seats. Cancel and rebook to change seats.'
      });
    }

    const showtimeId = reservation[0].showtime_id;

    const showtimeRows = await conn.query(
      'SELECT capacity FROM showtimes WHERE showtime_id = ? FOR UPDATE',
      [showtimeId]
    );

    if (showtimeRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Showtime not found' });
    }

    const capacity = Number(showtimeRows[0].capacity || 0);
    const seatState = await getEffectiveSeatState(conn, showtimeId, capacity, {
      ignoreReservationId: reservationId
    });

    if (parsedQuantity > seatState.availableSeatNumbers.length) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Not enough available seats',
        available_seats: seatState.availableSeatNumbers.length
      });
    }

    await conn.query(
      'UPDATE reservations SET quantity = ? WHERE reservation_id = ?',
      [parsedQuantity, reservationId]
    );

    await conn.commit();

    res.json({
      message: 'Reservation updated successfully',
      remaining_seats: seatState.availableSeatNumbers.length - parsedQuantity
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        // Ignore rollback errors to keep the original error response.
      }
    }
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const cancelReservation = async (req, res) => {
  let conn;
  try {
    const reservationId = req.params.id;
    const user_id = req.user.userId;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const reservation = await conn.query(
      `SELECT
         r.reservation_id,
         r.status,
         CASE
           WHEN TIMESTAMP(st.show_date, st.show_time) > NOW() THEN 1
           ELSE 0
         END AS is_future
       FROM reservations r
       JOIN showtimes st ON r.showtime_id = st.showtime_id
       WHERE r.reservation_id = ? AND r.user_id = ?
       FOR UPDATE`,
      [reservationId, user_id]
    );

    if (reservation.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (reservation[0].status !== 'active') {
      await conn.rollback();
      return res.status(400).json({ message: 'Reservation is already cancelled' });
    }

    if (Number(reservation[0].is_future) !== 1) {
      await conn.rollback();
      return res.status(400).json({ message: 'Only future reservations can be cancelled' });
    }

    await conn.query(
      'DELETE FROM reservation_seats WHERE reservation_id = ?',
      [reservationId]
    );

    await conn.query(
      'UPDATE reservations SET status = ? WHERE reservation_id = ?',
      ['cancelled', reservationId]
    );

    await conn.commit();

    res.json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        // Ignore rollback errors to keep the original error response.
      }
    }
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  createReservation,
  getUserReservations,
  updateReservation,
  cancelReservation
};
