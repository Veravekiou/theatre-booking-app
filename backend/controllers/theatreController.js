const pool = require('../config/db');

const getTheatres = async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const theatres = await conn.query('SELECT * FROM theatres');
    conn.release();

    res.json(theatres);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTheatres };