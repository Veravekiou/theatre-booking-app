const pool = require('../config/db');
const { getEffectiveSeatState } = require('../services/seatService');

const getSeatAvailability = async (req, res) => {
  let conn;
  try {
    const { showtimeId } = req.query;
    const parsedShowtimeId = Number(showtimeId);

    if (!showtimeId || !Number.isInteger(parsedShowtimeId) || parsedShowtimeId <= 0) {
      return res.status(400).json({ message: 'showtimeId is required' });
    }

    conn = await pool.getConnection();

    const showtimeRows = await conn.query(
      `SELECT
         st.showtime_id,
         st.show_date,
         st.show_time,
         st.hall,
         st.price,
         st.capacity,
         s.title AS show_title
       FROM showtimes st
       JOIN shows s ON st.show_id = s.show_id
       WHERE st.showtime_id = ?`,
      [parsedShowtimeId]
    );

    if (showtimeRows.length === 0) {
      return res.status(404).json({ message: 'Showtime not found' });
    }

    const showtime = showtimeRows[0];
    const capacity = Number(showtime.capacity || 0);
    const seatState = await getEffectiveSeatState(conn, parsedShowtimeId, capacity);

    const reservedSeats = seatState.reservedSeatNumbers.length;
    const availableSeats = seatState.availableSeatNumbers.length;

    const seats = seatState.allSeatLabels.map((seatNumber) => ({
      seat_number: seatNumber,
      status: seatState.reservedSeatSet.has(seatNumber) ? 'reserved' : 'available'
    }));

    res.json({
      showtime_id: showtime.showtime_id,
      show_title: showtime.show_title,
      show_date: showtime.show_date,
      show_time: showtime.show_time,
      hall: showtime.hall,
      price: showtime.price,
      total_seats: capacity,
      reserved_seats: reservedSeats,
      available_seats: availableSeats,
      seats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { getSeatAvailability };
