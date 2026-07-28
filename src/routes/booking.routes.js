const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");
const bookingController = require("../controllers/booking.controller");

const router = express.Router();

// Book a ride
router.post("/create", authMiddleware, bookingController.createBookingController);

// Get all bookings of logged-in user
router.get("/my-bookings", authMiddleware, bookingController.getMyBookingsController);

// Get booking details
router.get("/:id", authMiddleware, bookingController.getBookingByIdController);

// Cancel a booking
router.patch("/:id/cancel", authMiddleware, bookingController.cancelBookingController);

module.exports = router;