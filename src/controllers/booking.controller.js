const mongoose = require("mongoose");
const bookingModel = require("../models/booking.model");
const rideModel = require("../models/ride.model");

// Attach an HTTP status to errors raised inside a transaction so the controller
// can return the appropriate API response after the transaction is aborted.
const createHttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};


const createBookingController = async (req, res) => {
    const { rideId } = req.body;
    const userId = req.user._id;

    // Validate the identifier before opening a database session.
    if (!mongoose.Types.ObjectId.isValid(rideId)) {
        return res.status(400).json({
            message: "Invalid ride ID"
        });
    }

    // MongoDB transactions require a replica set. MongoDB Atlas supports this
    // by default; local MongoDB must be configured as a replica set.
    const session = await mongoose.startSession();

    try {
        let booking;

        // The booking document and ride document must be changed together.
        // If any operation fails, withTransaction aborts all changes made here.
        await session.withTransaction(async () => {
            const ride = await rideModel
                .findById(rideId)
                .session(session);

            if (!ride) {
                throw createHttpError(404, "Ride not found");
            }

            if (ride.status !== "active") {
                throw createHttpError(400, "Ride is no longer available");
            }

            const rideDateTime = new Date(
                `${ride.date.toISOString().split("T")[0]}T${ride.time}`
            );

            if (rideDateTime <= new Date()) {
                throw createHttpError(400, "Ride has already started or completed");
            }

            if (ride.creator.toString() === userId.toString()) {
                throw createHttpError(400, "You cannot book your own ride");
            }

            // Keep the existing one-record-per-user-and-ride design. A cancelled
            // booking is reactivated instead of creating a duplicate document.
            const existingBooking = await bookingModel
                .findOne({ user: userId, ride: rideId })
                .session(session);

            if (existingBooking?.status === "confirmed") {
                throw createHttpError(409, "You have already booked this ride");
            }

            if (existingBooking && existingBooking.status !== "cancelled") {
                throw createHttpError(409, "This booking cannot be reactivated");
            }

            // This conditional update is atomic. If two users try to reserve the
            // final seat, only one update can match availableSeats > 0.
            const reservedRide = await rideModel.findOneAndUpdate(
                {
                    _id: rideId,
                    status: "active",
                    availableSeats: { $gt: 0 }
                },
                {
                    $inc: { availableSeats: -1 },
                    $addToSet: { passengers: userId }
                },
                {
                    new: true,
                    session
                }
            );

            if (!reservedRide) {
                throw createHttpError(400, "No seats available");
            }

            if (existingBooking) {
                existingBooking.status = "confirmed";
                await existingBooking.save({ session });
                booking = existingBooking;
            } else {
                [booking] = await bookingModel.create(
                    [{ user: userId, ride: rideId }],
                    { session }
                );
            }
        });

        return res.status(201).json({
            message: "Ride booked successfully",
            booking
        });
    } catch (error) {
        // A concurrent duplicate booking is protected by the unique index.
        const statusCode = error.code === 11000
            ? 409
            : error.statusCode || 500;

        return res.status(statusCode).json({
            message: error.code === 11000
                ? "You have already booked this ride"
                : error.message
        });
    } finally {
        await session.endSession();
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
    const { id } = req.params;
    const userId = req.user._id;

    // Validate the identifier before opening a database session.
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            message: "Invalid booking ID"
        });
    }

    const session = await mongoose.startSession();

    try {
        let cancelledBooking;

        // Cancellation changes both the booking and its ride. Keeping both
        // updates in one transaction prevents a seat count from drifting if
        // either update fails.
        await session.withTransaction(async () => {
            const booking = await bookingModel
                .findById(id)
                .session(session);

            if (!booking) {
                throw createHttpError(404, "Booking not found");
            }

            if (booking.user.toString() !== userId.toString()) {
                throw createHttpError(403, "Unauthorized to cancel this booking");
            }

            if (booking.status !== "confirmed") {
                throw createHttpError(400, "Booking cannot be cancelled");
            }

            const ride = await rideModel
                .findById(booking.ride)
                .session(session);

            if (!ride) {
                throw createHttpError(404, "Associated ride not found");
            }

            // A ride cancellation transaction changes its bookings to
            // cancelled. This guard also prevents seat restoration if an old
            // inconsistent booking is still marked confirmed.
            if (ride.status !== "active") {
                throw createHttpError(400, "Ride is no longer available");
            }

            const rideDateTime = new Date(
                `${ride.date.toISOString().split("T")[0]}T${ride.time}`
            );

            if (rideDateTime <= new Date()) {
                throw createHttpError(400, "Ride has already started");
            }

            // The confirmed-status filter makes repeated cancellation safe:
            // only the first request can transition this booking.
            cancelledBooking = await bookingModel.findOneAndUpdate(
                {
                    _id: id,
                    user: userId,
                    status: "confirmed"
                },
                {
                    $set: { status: "cancelled" }
                },
                {
                    new: true,
                    session
                }
            );

            if (!cancelledBooking) {
                throw createHttpError(400, "Booking cannot be cancelled");
            }

            // Increment the seat and remove the passenger atomically within the
            // same transaction as the booking status change.
            const updatedRide = await rideModel.findOneAndUpdate(
                { _id: booking.ride, status: "active" },
                {
                    $inc: { availableSeats: 1 },
                    $pull: { passengers: userId }
                },
                {
                    new: true,
                    session
                }
            );

            if (!updatedRide) {
                throw createHttpError(404, "Associated ride not found");
            }
        });

        return res.status(200).json({
            message: "Booking cancelled successfully",
            booking: cancelledBooking
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message
        });
    } finally {
        await session.endSession();
    }
};


module.exports = {
    createBookingController,
    getMyBookingsController,
    getBookingByIdController,
    cancelBookingController
};
