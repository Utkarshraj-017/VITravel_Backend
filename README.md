# VITravels Backend

Backend API for **VITravels**, a ride-sharing platform designed for VIT Bhopal students to create rides, find available rides, join rides, and manage their journeys.

This README is primarily intended to help frontend developers understand and integrate with the backend API.

Note: AI tools were used for documentation, debugging, and troubleshooting assistance during the development & deployement process. However, AI tools were not used during the initial development or core implementation of the project.

---

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt
* Cookie-based authentication
* Brevo API for email OTP verification

---

# 1. Project Structure

```text
backend/
│
├── config/
│   ├── db.config.js
│   └── mail.config.js
│
├── controllers/
│   ├── auth.controller.js
│   ├── ride.controller.js
│   └── ...
│
├── middleware/
│   ├── auth.middleware.js
│   └── ...
│
├── models/
│   ├── user.model.js
│   ├── ride.model.js
│   ├── emailVerification.model.js
│   └── ...
│
├── routes/
│   ├── auth.routes.js
│   ├── ride.routes.js
│   └── ...
│
├── services/
│   ├── otpAuth.service.js
│   └── ...
│
├── app.js
├── server.js
├── .env
└── package.json
```

---

# 2. Running the Backend Locally

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd <backend-folder>

npm install
```

Create a `.env` file in the backend root.

Example:

```env
PORT=5000

MONGODB_URI=<your-mongodb-connection-string>

JWT_SECRET=<your-jwt-secret>

EMAIL_USER=<email-used-for-otp>
BREVO_API_KEY=<your-brevo-api-key>
```

Never commit the real `.env` file to GitHub.

Start the development server:

```bash
npm run dev
```

The backend should now be available at:

```text
http://localhost:5000
```

---

# 3. Frontend ↔ Backend Architecture

The frontend should **never communicate directly with MongoDB**.

```text
React Frontend
      |
      | HTTP Request
      | JSON
      v
Express Backend
      |
      | Controllers / Services
      v
MongoDB
      |
      v
Express Response
      |
      | JSON
      v
React Frontend
```

Example:

```text
React Login Form

      |
      | POST /api/auth/login
      v

Express Route
      |
      v
Login Controller
      |
      v
MongoDB
      |
      v
JSON Response
      |
      v
React Dashboard
```

---

# 4. API Base URL

During local development:

```text
http://localhost:5000
```

A frontend project should preferably store this in an environment variable rather than hardcoding it.

For a Vite frontend:

```env
VITE_API_URL=http://localhost:5000
```

Then:

```js
const API_URL = import.meta.env.VITE_API_URL;
```

After deployment, replace this value with the deployed backend URL.

---

# 5. Request Format

Unless stated otherwise, requests containing data should use JSON.

Example:

```js
fetch(`${API_URL}/api/auth/login`, {
    method: "POST",

    headers: {
        "Content-Type": "application/json",
    },

    body: JSON.stringify({
        username,
        password,
    }),

    credentials: "include",
});
```

`credentials: "include"` is important when authentication uses HTTP-only cookies.

---

# 6. Authentication

ViTravels uses JWT-based authentication.

After successful authentication, the backend stores the authentication token in an HTTP-only cookie.

Because the cookie is HTTP-only, frontend JavaScript should **not attempt to read the token directly**.

Instead, authenticated requests should include credentials:

```js
fetch(`${API_URL}/api/rides`, {
    credentials: "include",
});
```

The browser sends the authentication cookie automatically.

Protected backend routes use authentication middleware to verify the JWT and identify the currently logged-in user.

Conceptually:

```text
React
   |
   | request + cookie
   v
Auth Middleware
   |
   | verify JWT
   v
req.user
   |
   v
Controller
```

---

# 7. Authentication Flow

## Registration

The expected registration flow is:

```text
Enter Email
     |
     v
Send OTP
     |
     v
Enter OTP
     |
     v
Verify OTP
     |
     v
Submit Registration Details
     |
     v
Create User
```

Email verification happens before the user account is created.

---

## Send OTP

### Request

```http
POST /api/auth/send-otp
```

Example body:

```json
{
  "email": "student@vitbhopal.ac.in"
}
```

### Success Response

Example:

```json
{
  "message": "OTP sent successfully"
}
```

The OTP expires after a limited period.

The frontend should show an OTP input screen after this request succeeds.

---

## Verify OTP

### Request

```http
POST /api/auth/verify-otp
```

Example body:

```json
{
  "email": "student@vitbhopal.ac.in",
  "otp": "123456"
}
```

### Success Response

Example:

```json
{
  "message": "Email verified successfully"
}
```

After successful verification, the frontend can continue with account registration.

---

## Register User

### Request

```http
POST /api/auth/register
```

Example body:

```json
{
  "name": "Test User",
  "username": "testuser",
  "email": "student@vitbhopal.ac.in",
  "password": "password123"
}
```

The exact fields should match the current backend User model.

### Success Response

Example:

```json
{
  "message": "User registered successfully"
}
```

Passwords are hashed by the backend. The frontend must send the normal password over HTTPS and should never hash or store passwords itself.

---

# 8. Login

### Request

```http
POST /api/auth/login
```

Example body:

```json
{
  "username": "testuser",
  "password": "password123"
}
```

### Success

The backend authenticates the credentials and sets the JWT authentication cookie.

Example response:

```json
{
  "message": "Login successful",
  "status": "success"
}
```

Frontend:

```js
const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",

    headers: {
        "Content-Type": "application/json",
    },

    credentials: "include",

    body: JSON.stringify({
        username,
        password,
    }),
});

const data = await response.json();
```

After successful login, redirect the user to the dashboard.

---

# 9. Logout

The logout endpoint clears the authentication cookie and invalidates the
current JWT session, including bearer tokens sent in the `Authorization`
header.

```http
POST /api/auth/logout
```

Frontend example:

```js
await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
});
```

After logout, redirect the user to the login page.

---

# 10. Authentication Errors

Frontend code should always check `response.ok` or the HTTP status code.

Example:

```js
const response = await fetch(url, options);
const data = await response.json();

if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
}
```

Common HTTP status codes:

| Status | Meaning                                       |
| ------ | --------------------------------------------- |
| `200`  | Request successful                            |
| `201`  | Resource created                              |
| `400`  | Invalid request                               |
| `401`  | Authentication required / invalid credentials |
| `403`  | User does not have permission                 |
| `404`  | Resource not found                            |
| `409`  | Resource already exists                       |
| `429`  | Too many requests                             |
| `500`  | Internal server error                         |

The frontend should display the backend's `message` field when appropriate.

---

# 11. Ride APIs

The ride APIs are responsible for creating and retrieving available journeys.

Typical frontend flow:

```text
Dashboard
   |
   | GET rides
   v
Available Rides

Create Ride Page
   |
   | POST ride
   v
Backend
   |
   v
MongoDB
```

---

## Get Available Rides

```http
GET /api/rides
```

This endpoint is used by the frontend dashboard to retrieve rides.

Example:

```js
const response = await fetch(`${API_URL}/api/rides`, {
    credentials: "include",
});

const rides = await response.json();
```

The returned rides can then be rendered using React components such as:

```text
Dashboard
   |
   ├── RideCard
   ├── RideCard
   ├── RideCard
   └── RideCard
```

---

## Create Ride

```http
POST /api/rides/ride
```

This is a protected route.

Example body:

```json
{
  "from": "VIT Bhopal",
  "destination": "Bhopal Railway Station",
  "date": "2027-08-01",
  "time": "10:30",
  "availableSeats": 3,
  "price": 100
}
```

Frontend request:

```js
await fetch(`${API_URL}/api/rides/ride`, {
    method: "POST",

    headers: {
        "Content-Type": "application/json",
    },

    credentials: "include",

    body: JSON.stringify(rideData),
});
```

The backend should determine the ride creator from the authenticated user rather than trusting a user ID supplied by the frontend.

---

# 12. Recommended Frontend API Structure

Instead of putting `fetch()` everywhere inside React components, create a dedicated API layer.

Recommended structure:

```text
src/
│
├── api/
│   ├── auth.api.js
│   ├── rides.api.js
│   └── bookings.api.js
│
├── components/
├── pages/
└── App.jsx
```

Example `auth.api.js`:

```js
const API_URL = import.meta.env.VITE_API_URL;

export async function login(username, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
            username,
            password,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Login failed");
    }

    return data;
}
```

Then the React login page only needs:

```js
import { login } from "../api/auth.api";

const data = await login(username, password);
```

This keeps frontend components separate from API logic.

---

# 13. CORS

During development, React and Express usually run on different origins.

For example:

```text
Frontend
http://localhost:5173

Backend
http://localhost:5000
```

The backend therefore needs CORS configuration that allows the frontend origin.

When using cookies, both the frontend and backend must also enable credentials.

Frontend:

```js
credentials: "include"
```

Backend CORS configuration should allow credentials for the trusted frontend origin.

Do not use unrestricted origins with credentialed requests in production.

---

# 14. Recommended Frontend Pages

A React frontend can initially be structured around:

```text
src/pages/

Login.jsx
Register.jsx
VerifyEmail.jsx
Dashboard.jsx
CreateRide.jsx
RideDetails.jsx
MyRides.jsx
MyBookings.jsx
```

Reusable UI should live inside:

```text
src/components/

Navbar.jsx
RideCard.jsx
RideForm.jsx
LoadingSpinner.jsx
ProtectedRoute.jsx
```

---

# 15. Suggested React Routes

A frontend implementation could use:

```text
/                     Landing page

/login                Login
/register             Registration
/verify-email         OTP verification

/dashboard            Available rides

/rides/create         Create ride
/rides/:id            Ride details
/my-rides             User-created rides

/bookings             User bookings
```

Protected pages should only be accessible after authentication.

---

# 16. Frontend Integration Flow

A frontend developer implementing ViTravels should roughly follow:

```text
1. Configure API base URL
            ↓
2. Implement Register
            ↓
3. Implement OTP Verification
            ↓
4. Implement Login
            ↓
5. Handle Authentication
            ↓
6. Build Dashboard
            ↓
7. Fetch Available Rides
            ↓
8. Implement Create Ride
            ↓
9. Implement Ride Details
            ↓
10. Implement Booking / Joining
```

---

# 17. Important Frontend Rules

The frontend should never:

* Connect directly to MongoDB.
* Store user passwords.
* Store backend secrets.
* Put `JWT_SECRET`, database credentials, or email credentials in frontend environment variables.
* Trust frontend-side validation as security.
* Attempt to manually access HTTP-only authentication cookies.

Frontend validation exists mainly for user experience.

The backend remains responsible for authentication, authorization, validation, and security.

---

# 18. Environment Variables

### Backend

```env
PORT=5000
MONGODB_URI=
JWT_SECRET=
EMAIL_USER=
BREVO_API_KEY=
```

### Frontend

```env
VITE_API_URL=http://localhost:5000
```

Only values safe to expose publicly should use Vite frontend environment variables.

Never put backend secrets inside `VITE_*` variables.

---

# 19. Development Setup

Run the backend:

```bash
cd backend
npm install
npm run dev
```

Run the React frontend separately:

```bash
cd frontend
npm install
npm run dev
```

Typical local architecture:

```text
Browser
   |
   v
React
localhost:5173
   |
   | HTTP / JSON
   v
Express
localhost:5000
   |
   v
MongoDB Atlas
```

---

# 20. API Documentation Checklist

Before implementing a frontend feature, verify:

```text
Endpoint
HTTP method
Authentication required?
Request body
Query parameters
Success response
Error responses
```

For example:

```text
POST /api/auth/login

Auth: No

Body:
{
    username,
    password
}

Success:
200

Errors:
400 - Missing data
401 - Invalid credentials
500 - Server error
```

Keeping every backend endpoint documented in this format makes frontend integration significantly easier.

---

# VITravels

Built as a student ride-sharing platform for VIT Bhopal.

The backend provides authentication, user management, ride management, booking/joining functionality, and the APIs required by the frontend application.
