# BloodLink MERN Working Model

BloodLink is a complete MERN-stack donor-recipient workflow platform with role-based auth, blood matching, notifications, scheduling, and admin controls.

## Features

- JWT authentication with bcrypt password hashing
- Roles: donor, recipient, admin
- Blood compatibility matching + match scoring
- Donor search by blood group, city, area
- Request urgency levels: normal, urgent, critical
- Automatic donor matching + notifications
- Donor acceptance/rejection flow
- Donation scheduling and completion tracking
- Admin dashboard stats + donor verification
- Responsive React UI with workflow tabs

## Project Structure

- server/
  - models/
    - User.js
    - BloodRequest.js
    - Donation.js
    - Notification.js
  - routes/
    - auth.js
    - donors.js
    - requests.js
    - donations.js
    - notifications.js
    - admin.js
  - middleware/
    - auth.js
  - utils/
    - matching.js
  - src.js
- client/
  - src/
    - App.jsx
    - styles.css
    - main.jsx
    - lib/api.js

## Backend Setup

1. Open terminal in `server`.
2. Install dependencies:
   - `npm install`
3. Create env file from template:
   - copy `.env.example` to `.env`
4. Update env values:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_ORIGIN`
5. Run API:
   - `npm run dev`

Admin accounts are intentionally not open through public register to prevent role escalation.
Create an admin explicitly:

- `npm run seed:admin -- "Admin Name" "admin@bloodlink.local" "StrongPassword123" "O+"`

API starts on `http://localhost:5000`.
Health endpoint: `GET /health`

## Frontend Setup

1. Open terminal in `client`.
2. Install dependencies:
   - `npm install`
3. (Optional) create `.env` with API base:
   - `VITE_API_BASE=http://localhost:5000/api`
4. Run app:
   - `npm run dev`

UI runs on `http://localhost:5173`.

## Security Hardening Included

- Helmet security headers
- CORS origin restriction
- Express JSON size limit
- Mongo operator sanitization
- HPP parameter pollution protection
- API-wide rate limiting
- JWT route protection + role authorization

## Core API Summary

- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Donors
  - `GET /api/donors/search?bloodGroup=&city=&area=`
- Requests
  - `POST /api/requests`
  - `GET /api/requests/mine`
  - `POST /api/requests/:id/respond`
  - `PATCH /api/requests/:id/complete`
- Donations
  - `POST /api/donations/schedule`
  - `PATCH /api/donations/:id/complete`
  - `GET /api/donations/mine`
- Notifications
  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`
  - `PATCH /api/notifications/read-all`
- Admin
  - `GET /api/admin/stats`
  - `GET /api/admin/donors`
  - `PATCH /api/admin/donors/:id/verify`

## Suggested Test Flow

1. Create one admin via seed command, then register one donor and one recipient.
2. Login admin and verify donor.
3. Login recipient and create urgent request.
4. Login donor and accept matched request.
5. Login recipient/admin and schedule donation.
6. Mark donation completed and verify stats update.

## Notes

- This is a functional reference model and can be extended with audit logs, refresh tokens, websocket notifications, and automated tests.
