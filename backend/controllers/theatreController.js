const pool = require('../config/db');

const getTheatres = async (req, res) => {
  let conn;
  try {
    const { name, location } = req.query;
    conn = await pool.getConnection();

    const conditions = [];
    const params = [];

    if (name) {
      conditions.push('name LIKE ?');
      params.push(`%${name}%`);
    }

    if (location) {
      conditions.push('location LIKE ?');
      params.push(`%${location}%`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const theatres = await conn.query(
      `SELECT theatre_id, name, location, description
       FROM theatres
       ${whereClause}
       ORDER BY name ASC`,
      params
    );

    res.json(theatres);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { getTheatres };
