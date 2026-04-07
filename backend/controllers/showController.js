const pool = require('../config/db');

const getShows = async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const shows = await conn.query('SELECT * FROM shows');
    conn.release();

    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getShows };