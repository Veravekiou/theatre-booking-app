# Theatre Booking App

Theatre Booking App is a full-stack application for browsing theatre productions, viewing available showtimes, selecting seats, and managing reservations.

The project consists of:

- `frontend/`: Expo React Native application
- `backend/`: Express.js REST API with MariaDB

## Functionality

The application supports the following core features:

- User registration and login with JWT-based authentication
- Browse theatre productions with filters for title, theatre, and date
- View available showtimes for each production
- Select seats from a visual seating layout
- Support for reserved and available seat states
- VIP seat pricing for the front rows
- Create ticket reservations
- View reservation history from the user profile
- Cancel reservations
- Update reservation quantity when seat-level selection is not used

## Tech Stack

- Frontend: Expo, React Native, Expo Router, Axios
- Backend: Node.js, Express.js
- Database: MariaDB
- Authentication: JWT

## Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd theatre-booking-app
```

### 2. Set up the database

Create a MariaDB database and run the schema file:

```bash
mysql -u root -p < backend/sql/schema.sql
```

This will create the `theatre_booking` database and the required tables:

- `users`
- `theatres`
- `shows`
- `showtimes`
- `reservations`
- `reservation_seats`

### 3. Configure environment variables for the backend

Create a file named `.env` inside the `backend/` folder with the following values:

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=theatre_booking
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
PORT=5000
```

Notes:

- `JWT_REFRESH_SECRET` can be different from `JWT_SECRET`
- If `PORT` is omitted, the backend defaults to `5000`

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Seed sample data

Run the available seed scripts to insert theatres, shows, and showtimes:

```bash
npm run seed
```

This command runs:

- `npm run seed:init`
- `npm run seed:showtimes`

### 6. Start the backend server

```bash
npm run dev
```

or

```bash
npm start
```

The API will be available at:

```text
http://localhost:5000
```

### 7. Configure the frontend API URL

The frontend uses:

```text
EXPO_PUBLIC_API_URL
```

Create a file named `.env` inside the `frontend/` folder:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api
```

If you run the mobile app on a physical device, replace `YOUR_LOCAL_IP` with the local IP address of the computer running the backend.

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.17:5000/api
```

### 8. Install frontend dependencies

Open a new terminal and run:

```bash
cd frontend
npm install
```

### 9. Start the frontend

```bash
npx expo start
```

You can then run the application using:

- Expo Go
- Android emulator
- iOS simulator
- Web preview

## API Overview

Main backend endpoints:

- `POST /api/register`
- `POST /api/login`
- `POST /api/refresh`
- `GET /api/theatres`
- `GET /api/shows`
- `GET /api/showtimes`
- `GET /api/seats`
- `POST /api/reservations`
- `GET /api/user/reservations`
- `PUT /api/reservations/:id`
- `DELETE /api/reservations/:id`
- `GET /api/profile`

## Project Structure

```text
theatre-booking-app/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- routes/
|   |-- scripts/
|   |-- sql/
|   `-- server.js
|-- frontend/
|   |-- app/
|   |-- assets/
|   |-- components/
|   |-- constants/
|   |-- hooks/
|   |-- services/
|   `-- utils/
`-- README.md
```

## Notes

- The backend must be running before the frontend can fetch data.
- For mobile testing on a real device, frontend and backend must be on the same local network.
- The provided seed scripts populate the database with sample theatres, shows, and multiple future showtimes.

## Authors

Created as a theatre booking system assignment/project.
