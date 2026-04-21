# Theatre Booking App

Theatre Booking App is a full-stack mobile booking system for theatre performances. Users can register, log in, browse productions, view available showtimes, select seats, and manage their reservations from a React Native app connected to a Node.js REST API and a MariaDB database.

## Features

- User registration and login with JWT authentication
- Secure token storage on the mobile client
- Automatic access-token refresh
- Browse theatre productions and showtimes
- Search and filter shows by title, theatre, and date
- Seat availability view with reserved and available seat states
- VIP seat pricing for front rows
- Create reservations for selected seats
- View reservation history in the user profile
- Cancel future reservations
- Update quantity for reservations without seat-level selection
- Transaction-safe reservation handling to reduce double booking

## Tech Stack

- Frontend: Expo, React Native, Expo Router, Axios
- Backend: Node.js, Express.js
- Database: MariaDB
- Authentication: JWT

## Repository Structure

```text
theatre-booking-app/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- routes/
|   |-- scripts/
|   |-- services/
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

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Veravekiou/theatre-booking-app.git
cd theatre-booking-app
```

### 2. Create the database

Run the schema file:

```bash
mysql -u root -p < backend/sql/schema.sql
```

This creates the `theatre_booking` database and the required tables.

### 3. Configure the backend

Create `backend/.env` using `backend/.env.example` as a template:

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

- `JWT_REFRESH_SECRET` may be different from `JWT_SECRET`
- If `PORT` is omitted, the backend defaults to `5000`

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Seed sample data

```bash
npm run seed
```

This runs:

- `npm run seed:init`
- `npm run seed:showtimes`

### 6. Start the backend

```bash
npm run dev
```

or

```bash
npm start
```

The API runs at `http://localhost:5000`.

### 7. Configure the frontend

Create `frontend/.env` using `frontend/.env.example` as a template:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5000/api
```

If you run the app on a physical device, replace `YOUR_LOCAL_IP` with the local IP address of the computer running the backend.

If `EXPO_PUBLIC_API_URL` is not set, the app can still try to detect the current Expo host automatically, but setting the variable explicitly is safer for grading and demos.

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.17:5000/api
```

### 8. Install frontend dependencies

```bash
cd frontend
npm install
```

### 9. Start the frontend

```bash
npx expo start
```

You can run the app with:

- Expo Go
- Android emulator
- iOS simulator
- Web preview

## Main API Endpoints

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

## Architecture Notes

- Frontend: Expo React Native app with screens for authentication, browsing, showtimes, seat selection, and reservation history
- Backend: Express REST API with route/controller separation
- Database: MariaDB schema with foreign keys between users, theatres, shows, showtimes, reservations, and reserved seats
- Concurrency handling: reservations use database transactions and row locking for better seat consistency

## Notes

- `backend/.env.example` and `frontend/.env.example` are included for setup guidance
- The backend must be running before the frontend can fetch data
- For real-device testing, frontend and backend must be on the same local network
- Seed scripts populate sample theatres, shows, and multiple future showtimes
