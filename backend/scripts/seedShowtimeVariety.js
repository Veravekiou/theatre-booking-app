const pool = require('../config/db');

const templateSlots = [
  { dayOffset: 1, time: '17:30:00', hall: 'Main Hall', priceDelta: 0 },
  { dayOffset: 1, time: '20:30:00', hall: 'Main Hall', priceDelta: 2 },
  { dayOffset: 2, time: '19:00:00', hall: 'Studio Hall', priceDelta: 1 },
  { dayOffset: 3, time: '18:30:00', hall: 'Main Hall', priceDelta: 0 },
  { dayOffset: 4, time: '21:00:00', hall: 'Main Hall', priceDelta: 3 },
  { dayOffset: 6, time: '16:00:00', hall: 'Studio Hall', priceDelta: 0 },
  { dayOffset: 6, time: '19:30:00', hall: 'Main Hall', priceDelta: 2 },
  { dayOffset: 8, time: '20:00:00', hall: 'Main Hall', priceDelta: 2 },
  { dayOffset: 10, time: '18:00:00', hall: 'Studio Hall', priceDelta: 1 },
  { dayOffset: 12, time: '21:30:00', hall: 'Main Hall', priceDelta: 3 }
];

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, dayOffset) => {
  const next = new Date(date);
  next.setDate(next.getDate() + dayOffset);
  return next;
};

const roundPrice = (value) => Math.max(6, Math.round(value * 100) / 100);

const getInsertRowsForShow = (showRow, showIndex) => {
  const showId = Number(showRow.show_id);
  const basePrice = Number(showRow.base_price);
  const baseCapacity = Number(showRow.base_capacity);

  const safeBasePrice = Number.isFinite(basePrice) ? basePrice : 16;
  const safeCapacity = Number.isFinite(baseCapacity) ? Math.max(40, baseCapacity) : 120;

  const today = new Date();
  const indexShift = showIndex % 3;

  return templateSlots.map((slot, slotIndex) => {
    const showDate = toIsoDate(addDays(today, slot.dayOffset + indexShift));
    const dynamicDelta = (slotIndex + showIndex) % 2 === 0 ? 0 : 0.5;

    return {
      showId,
      showDate,
      showTime: slot.time,
      hall: slot.hall,
      price: roundPrice(safeBasePrice + slot.priceDelta + dynamicDelta),
      capacity: safeCapacity
    };
  });
};

const run = async () => {
  let conn;

  try {
    conn = await pool.getConnection();

    const shows = await conn.query(
      `SELECT
         s.show_id,
         COALESCE(MIN(st.price), 16.00) AS base_price,
         COALESCE(MAX(st.capacity), 120) AS base_capacity
       FROM shows s
       LEFT JOIN showtimes st ON st.show_id = s.show_id
       GROUP BY s.show_id
       ORDER BY s.show_id ASC`
    );

    if (!shows || shows.length === 0) {
      console.log('No shows found. Add shows first.');
      return;
    }

    let insertedCount = 0;
    let ignoredCount = 0;

    for (let i = 0; i < shows.length; i += 1) {
      const rows = getInsertRowsForShow(shows[i], i);

      for (const row of rows) {
        const result = await conn.query(
          `INSERT INTO showtimes
             (show_id, show_date, show_time, hall, price, capacity)
           SELECT ?, ?, ?, ?, ?, ?
           WHERE NOT EXISTS (
             SELECT 1
             FROM showtimes st
             WHERE st.show_id = ?
               AND st.show_date = ?
               AND st.show_time = ?
               AND st.hall = ?
           )`,
          [
            row.showId,
            row.showDate,
            row.showTime,
            row.hall,
            row.price,
            row.capacity,
            row.showId,
            row.showDate,
            row.showTime,
            row.hall
          ]
        );

        if (result.affectedRows === 1) {
          insertedCount += 1;
        } else {
          ignoredCount += 1;
        }
      }
    }

    const totals = await conn.query('SELECT COUNT(*) AS total_showtimes FROM showtimes');
    const totalShowtimes = totals[0]?.total_showtimes;

    console.log(`Inserted: ${insertedCount}`);
    console.log(`Skipped (already existed): ${ignoredCount}`);
    console.log(`Total showtimes now: ${totalShowtimes}`);
  } catch (error) {
    console.error('Failed to seed showtime variety:', error.message);
    process.exitCode = 1;
  } finally {
    if (conn) {
      conn.release();
    }
    await pool.end();
  }
};

run();
