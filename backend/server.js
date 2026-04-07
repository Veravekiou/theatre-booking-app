const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const theatreRoutes = require('./routes/theatreRoutes');
const showRoutes = require('./routes/showRoutes');
const userRoutes = require('./routes/userRoutes');
const showtimeRoutes = require('./routes/showtimeRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const seatRoutes = require('./routes/seatRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use('/api', authRoutes);
app.use('/api', theatreRoutes);
app.use('/api', showRoutes);
app.use('/api', userRoutes);
app.use('/api', showtimeRoutes);
app.use('/api', reservationRoutes);
app.use('/api', seatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
