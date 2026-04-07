const pool = require('../config/db');

const getShows = async (req, res) => {
  let conn;
  try {
    const { theatreId, title, date } = req.query;
    conn = await pool.getConnection();

    const conditions = [];
    const params = [];

    if (theatreId) {
      conditions.push('s.theatre_id = ?');
      params.push(theatreId);
    }

    if (title) {
      conditions.push('s.title LIKE ?');
      params.push(`%${title}%`);
    }

    if (date) {
      conditions.push(
        `EXISTS (
          SELECT 1
          FROM showtimes st
          WHERE st.show_id = s.show_id AND st.show_date = ?
        )`
      );
      params.push(date);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const shows = await conn.query(
      `SELECT
         s.show_id,
         s.theatre_id,
         s.title,
         s.description,
         s.duration,
         s.age_rating,
         t.name AS theatre_name,
         t.location AS theatre_location
       FROM shows s
       JOIN theatres t ON s.theatre_id = t.theatre_id
       ${whereClause}
       ORDER BY s.title ASC`,
      params
    );

    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { getShows };
