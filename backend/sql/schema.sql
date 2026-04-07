CREATE DATABASE IF NOT EXISTS theatre_booking;
USE theatre_booking;

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS theatres (
  theatre_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  location VARCHAR(150) NOT NULL,
  description TEXT,
  UNIQUE KEY uk_theatre_name_location (name, location)
);

CREATE TABLE IF NOT EXISTS shows (
  show_id INT AUTO_INCREMENT PRIMARY KEY,
  theatre_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  duration INT NOT NULL,
  age_rating VARCHAR(20),
  UNIQUE KEY uk_show_theatre_title (theatre_id, title),
  CONSTRAINT fk_shows_theatre
    FOREIGN KEY (theatre_id) REFERENCES theatres(theatre_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS showtimes (
  showtime_id INT AUTO_INCREMENT PRIMARY KEY,
  show_id INT NOT NULL,
  show_date DATE NOT NULL,
  show_time TIME NOT NULL,
  hall VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  capacity INT NOT NULL,
  UNIQUE KEY uk_showtime_slot (show_id, show_date, show_time, hall),
  CONSTRAINT fk_showtimes_show
    FOREIGN KEY (show_id) REFERENCES shows(show_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
  reservation_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  showtime_id INT NOT NULL,
  quantity INT NOT NULL,
  status ENUM('active', 'cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservations_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reservations_showtime
    FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id)
    ON DELETE CASCADE
);

-- Optional sample data (adjust ids if needed):
-- INSERT INTO theatres (name, location, description)
-- VALUES ('National Theatre', 'Athens', 'Central stage with contemporary productions');
--
-- INSERT INTO shows (theatre_id, title, description, duration, age_rating)
-- VALUES (1, 'Antigone', 'Classical tragedy in a modern adaptation', 120, '12+');
--
-- INSERT INTO showtimes (show_id, show_date, show_time, hall, price, capacity)
-- VALUES (1, '2026-04-10', '20:00:00', 'Main Hall', 18.00, 120);
