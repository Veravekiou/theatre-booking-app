const pool = require('../config/db');

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const createReservation = async (req, res) => {
  let conn;
  try {
    const { showtime_id, quantity } = req.body;
    const user_id = req.user.userId;
    const parsedShowtimeId = parsePositiveInteger(showtime_id);
    const parsedQuantity = parsePositiveInteger(quantity);

    if (!parsedShowtimeId || !parsedQuantity) {
      return res.status(400).json({
        message: 'showtime_id and quantity must be positive integers'
      });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const showtime = await conn.query(
      `SELECT
         showtime_id,
         capacity,
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

    const reservedRows = await conn.query(
      `SELECT COALESCE(SUM(quantity), 0) AS reserved_seats
       FROM reservations
       WHERE showtime_id = ? AND status = 'active'
       FOR UPDATE`,
      [parsedShowtimeId]
    );

    const reservedSeats = Number(reservedRows[0].reserved_seats || 0);
    const availableSeats = Math.max(capacity - reservedSeats, 0);

    if (parsedQuantity > availableSeats) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Not enough available seats',
        available_seats: availableSeats
      });
    }

    const result = await conn.query(
      'INSERT INTO reservations (user_id, showtime_id, quantity, status) VALUES (?, ?, ?, ?)',
      [user_id, parsedShowtimeId, parsedQuantity, 'active']
    );

    await conn.commit();

    res.status(201).json({
      message: 'Reservation created successfully',
      reservationId: Number(result.insertId),
      remaining_seats: availableSeats - parsedQuantity
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
         CASE
           WHEN r.status = 'active' AND TIMESTAMP(st.show_date, st.show_time) > NOW() THEN 1
           ELSE 0
         END AS can_modify
       FROM reservations r
       JOIN showtimes st ON r.showtime_id = st.showtime_id
       JOIN shows s ON st.show_id = s.show_id
       JOIN theatres t ON s.theatre_id = t.theatre_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [user_id]
    );

    res.json(reservations);
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

    const reservedRows = await conn.query(
      `SELECT COALESCE(SUM(quantity), 0) AS reserved_seats
       FROM reservations
       WHERE showtime_id = ? AND status = 'active' AND reservation_id <> ?
       FOR UPDATE`,
      [showtimeId, reservationId]
    );

    const reservedSeats = Number(reservedRows[0].reserved_seats || 0);
    const availableSeats = Math.max(capacity - reservedSeats, 0);

    if (parsedQuantity > availableSeats) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Not enough available seats',
        available_seats: availableSeats
      });
    }

    await conn.query(
      'UPDATE reservations SET quantity = ? WHERE reservation_id = ?',
      [parsedQuantity, reservationId]
    );

    await conn.commit();

    res.json({
      message: 'Reservation updated successfully',
      remaining_seats: availableSeats - parsedQuantity
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
