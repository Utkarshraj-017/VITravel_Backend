const mongoose = require("mongoose");
const bookingModel = require("../models/booking.model");
const rideModel = require("../models/ride.model");


const createBookingController = async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user._id;

        // Validate ride ID
        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({
                message: "Invalid ride ID"
            });
        }

        // Check if ride exists
        const ride = await rideModel.findById(rideId);

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found"
            });
        }

        // Ride should be active
        if (ride.status !== "active") {
            return res.status(400).json({
                message: "Ride is no longer available"
            });
        }

        // Ride date & time should not have passed
        const rideDateTime = new Date(
            `${ride.date.toISOString().split("T")[0]}T${ride.time}`
        );

        if (rideDateTime <= new Date()) {
            return res.status(400).json({
                message: "Ride has already started or completed"
            });
        }

        // Creator cannot book their own ride
        if (ride.creator.toString() === userId.toString()) {
            return res.status(400).json({
                message: "You cannot book your own ride"
            });
        }

        // Check seat availability
        if (ride.availableSeats <= 0) {
            return res.status(400).json({
                message: "No seats available"
            });
        }

        // Prevent duplicate booking
        const existingBooking = await bookingModel.findOne({
            user: userId,
            ride: rideId
        });

        if (existingBooking) {
            return res.status(409).json({
                message: "You have already booked this ride"
            });
        }

        // Create booking
        const booking = await bookingModel.create({
            user: userId,
            ride: rideId
        });

        // Update ride
        ride.availableSeats--;
        ride.passengers.push(userId);

        await ride.save();

        return res.status(201).json({
            message: "Ride booked successfully",
            booking
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const getMyBookingsController = async (req, res) => {
    try {
        const userId = req.user._id;

        const bookings = await bookingModel
            .find({ user: userId })
            .populate({
                path: "ride",
                populate: {
                    path: "creator",
                    select: "name username"
                }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            bookings
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const getBookingByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Validate booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid booking ID"
            });
        }

        // Find booking
        const booking = await bookingModel
            .findById(id)
            .populate({
                path: "ride",
                populate: {
                    path: "creator",
                    select: "name username"
                }
            });

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        // User can only view their own booking
        if (booking.user.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Unauthorized to access this booking"
            });
        }

        return res.status(200).json({
            booking
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};


const cancelBookingController = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Validate booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid booking ID"
            });
        }

        // Find booking
        const booking = await bookingModel.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        // Booking should belong to logged-in user
        if (booking.user.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "Unauthorized to cancel this booking"
            });
        }

        // Booking should be confirmed
        if (booking.status !== "confirmed") {
            return res.status(400).json({
                message: "Booking cannot be cancelled"
            });
        }

        // Find associated ride
        const ride = await rideModel.findById(booking.ride);

        if (!ride) {
            return res.status(404).json({
                message: "Associated ride not found"
            });
        }

        // Cancel booking
        booking.status = "cancelled";

        // Update ride
        ride.availableSeats++;

        ride.passengers = ride.passengers.filter(
            passenger => passenger.toString() !== userId.toString()
        );

        await booking.save();
        await ride.save();

        return res.status(200).json({
            message: "Booking cancelled successfully",
            booking
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};


module.exports = {
    createBookingController,
    getMyBookingsController,
    getBookingByIdController,
    cancelBookingController
};