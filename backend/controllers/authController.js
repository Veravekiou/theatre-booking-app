const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getRefreshSecret = () => {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
};

const createAccessToken = (user) => {
  return jwt.sign(
    { userId: user.user_id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const createRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.user_id, email: user.email },
    getRefreshSecret(),
    { expiresIn: '7d' }
  );
};

const registerUser = async (req, res) => {
  let conn;
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    conn = await pool.getConnection();

    const existingUsers = await conn.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await conn.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const loginUser = async (req, res) => {
  let conn;
  try {
    const { email, password } = req.body;

    conn = await pool.getConnection();

    const users = await conn.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res.json({
      message: 'Login successful',
      token,
      accessToken: token,
      refreshToken,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const refreshAccessToken = async (req, res) => {
  let conn;
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'refreshToken is required' });
    }

    const decoded = jwt.verify(refreshToken, getRefreshSecret());

    conn = await pool.getConnection();
    const users = await conn.query(
      'SELECT user_id, email FROM users WHERE user_id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = users[0];
    const newAccessToken = createAccessToken(user);

    res.json({
      token: newAccessToken,
      accessToken: newAccessToken
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { registerUser, loginUser, refreshAccessToken };
