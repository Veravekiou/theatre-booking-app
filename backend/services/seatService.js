const SEATS_PER_ROW = 10;

const toRowLabel = (rowIndex) => {
  let value = rowIndex + 1;
  let label = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
};

const normalizeSeatNumber = (seatNumber) => {
  return String(seatNumber || '').trim().toUpperCase();
};

const normalizeSeatNumbers = (seatNumbers = []) => {
  if (!Array.isArray(seatNumbers)) {
    return [];
  }

  return Array.from(
    new Set(
      seatNumbers
        .map(normalizeSeatNumber)
        .filter((seatNumber) => seatNumber.length > 0)
    )
  );
};

const generateSeatLabels = (capacity) => {
  const safeCapacity = Number.isInteger(Number(capacity))
    ? Math.max(Number(capacity), 0)
    : 0;

  const seatLabels = [];

  for (let index = 0; index < safeCapacity; index += 1) {
    const rowIndex = Math.floor(index / SEATS_PER_ROW);
    const seatIndexInRow = (index % SEATS_PER_ROW) + 1;
    seatLabels.push(`${toRowLabel(rowIndex)}${seatIndexInRow}`);
  }

  return seatLabels;
};

const getEffectiveSeatState = async (conn, showtimeId, capacity, options = {}) => {
  const ignoreReservationId = options.ignoreReservationId
    ? Number(options.ignoreReservationId)
    : null;

  const allSeatLabels = generateSeatLabels(capacity);
  const validSeatLabelSet = new Set(allSeatLabels);

  const reservations = await conn.query(
    `SELECT reservation_id, quantity
     FROM reservations
     WHERE showtime_id = ? AND status = 'active'
     ORDER BY created_at ASC, reservation_id ASC`,
    [showtimeId]
  );

  const persistedSeatRows = await conn.query(
    `SELECT rs.reservation_id, rs.seat_number
     FROM reservation_seats rs
     JOIN reservations r ON rs.reservation_id = r.reservation_id
     WHERE rs.showtime_id = ? AND r.status = 'active'
     ORDER BY rs.reservation_id ASC, rs.seat_number ASC`,
    [showtimeId]
  );

  const persistedSeatMap = new Map();
  for (const row of persistedSeatRows) {
    const reservationId = Number(row.reservation_id);
    const normalizedSeat = normalizeSeatNumber(row.seat_number);

    if (!validSeatLabelSet.has(normalizedSeat)) {
      continue;
    }

    if (!persistedSeatMap.has(reservationId)) {
      persistedSeatMap.set(reservationId, []);
    }

    persistedSeatMap.get(reservationId).push(normalizedSeat);
  }

  const usedSeatSet = new Set();
  const reservationSeatMap = new Map();

  for (const reservation of reservations) {
    const reservationId = Number(reservation.reservation_id);

    if (ignoreReservationId !== null && reservationId === ignoreReservationId) {
      continue;
    }

    const quantity = Math.max(Number(reservation.quantity || 0), 0);
    const persistedSeats = persistedSeatMap.get(reservationId) || [];

    const assignedSeats = [];

    for (const seat of persistedSeats) {
      if (usedSeatSet.has(seat)) {
        continue;
      }
      usedSeatSet.add(seat);
      assignedSeats.push(seat);
    }

    let seatsToBackfill = Math.max(quantity - assignedSeats.length, 0);

    if (seatsToBackfill > 0) {
      for (const seatLabel of allSeatLabels) {
        if (seatsToBackfill === 0) {
          break;
        }
        if (usedSeatSet.has(seatLabel)) {
          continue;
        }
        usedSeatSet.add(seatLabel);
        assignedSeats.push(seatLabel);
        seatsToBackfill -= 1;
      }
    }

    reservationSeatMap.set(reservationId, assignedSeats);
  }

  const reservedSeatNumbers = Array.from(usedSeatSet);
  const reservedSeatSet = new Set(reservedSeatNumbers);
  const availableSeatNumbers = allSeatLabels.filter(
    (seatLabel) => !reservedSeatSet.has(seatLabel)
  );

  return {
    allSeatLabels,
    reservedSeatNumbers,
    reservedSeatSet,
    availableSeatNumbers,
    reservationSeatMap
  };
};

module.exports = {
  normalizeSeatNumber,
  normalizeSeatNumbers,
  generateSeatLabels,
  getEffectiveSeatState
};
