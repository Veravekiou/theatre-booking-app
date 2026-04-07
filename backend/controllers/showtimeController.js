const pool = require('../config/db');

const getShowtimes = async (req, res) => {
  let conn;
  try {
    const {
      showId,
      theatreId,
      title,
      theatreName,
      location,
      date
    } = req.query;
    conn = await pool.getConnection();

    const conditions = [];
    const params = [];

    if (showId) {
      conditions.push('st.show_id = ?');
      params.push(showId);
    }

    if (theatreId) {
      conditions.push('s.theatre_id = ?');
      params.push(theatreId);
    }

    if (title) {
      conditions.push('s.title LIKE ?');
      params.push(`%${title}%`);
    }

    if (theatreName) {
      conditions.push('t.name LIKE ?');
      params.push(`%${theatreName}%`);
    }

    if (location) {
      conditions.push('t.location LIKE ?');
      params.push(`%${location}%`);
    }

    if (date) {
      conditions.push('st.show_date = ?');
      params.push(date);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const showtimes = await conn.query(
      `SELECT
         st.showtime_id,
         st.show_id,
         st.show_date,
         st.show_time,
         st.hall,
         st.price,
         st.capacity,
         s.title AS show_title,
         s.duration,
         s.age_rating,
         t.theatre_id,
         t.name AS theatre_name,
         t.location AS theatre_location,
         COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.quantity ELSE 0 END), 0) AS reserved_seats,
         st.capacity - COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.quantity ELSE 0 END), 0) AS available_seats
       FROM showtimes st
       JOIN shows s ON st.show_id = s.show_id
       JOIN theatres t ON s.theatre_id = t.theatre_id
       LEFT JOIN reservations r ON st.showtime_id = r.showtime_id
       ${whereClause}
       GROUP BY
         st.showtime_id,
         st.show_id,
         st.show_date,
         st.show_time,
         st.hall,
         st.price,
         st.capacity,
         s.title,
         s.duration,
         s.age_rating,
         t.theatre_id,
         t.name,
         t.location
       ORDER BY st.show_date ASC, st.show_time ASC`,
      params
    );

    res.json(showtimes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { getShowtimes };
