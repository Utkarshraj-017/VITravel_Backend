const rideModel = require("../models/ride.model");
const bookingModel = require("../models/booking.model");
const mongoose = require("mongoose");

// Attach an HTTP status to errors raised inside the ride-cancellation
// transaction so the controller can return the correct API response.
const createHttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const createRideController = async (req, res) => {
    try {
        const {
            from,
            destination,
            date,
            time,
            availableSeats,
            price
        } = req.body;

        // validating the required fields
        if (!from || !destination || !date || !time || availableSeats == null || price == null) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // validating the Seats and price
        if (availableSeats <= 0 || price <= 0) {
            return res.status(400).json({ message: "Available seats and price must be greater than 0" });
        }
        // validating same from and destination
        if (from.trim().toLowerCase() === destination.trim().toLowerCase()) {
            return res.status(400).json({
                message: "Source and destination cannot be the same"
            });
        }

        // validating date and time
        const rideDateTime = new Date(`${date}T${time}`);

        if (isNaN(rideDateTime.getTime())) {
            return res.status(400).json({
                message: "Invalid date or time"
            });
        }

        if (rideDateTime <= new Date()) {
            return res.status(400).json({
                message: "Ride date and time must be in the future"
            });
        }

        // getting the creator id from the request object : It is set in the auth middleware after verifying the token
        const creatorId = req.user._id;

        // creating ride
        const newRide = new rideModel({
            from,
            destination,
            date,
            time,
            availableSeats,
            price,
            creator: creatorId
        });

        await newRide.save();
        return res.status(201).json(newRide);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getAllRidesController = async (req, res) => {
    try {

        // 1. Get optional filters from req.query
        // any parameters not provided will be undefined 
        const { from, destination, date, availableSeats, minPrice, maxPrice } = req.query;

        const filter = {
            status: "active",
            availableSeats: { $gt: 0 }

        }
        // 2. Add filters to the filter object if they are provided
        if (from) {
            filter.from = {
                $regex: from,
                $options: "i"   // case-insensitive search
            };
        }

        if (destination) {
            filter.destination = {
                $regex: destination,
                $options: "i"
            };
        }

        if (availableSeats !== undefined) {
            const minimumSeats = Number(availableSeats);

            if (!Number.isFinite(minimumSeats) || minimumSeats < 0) {
                return res.status(400).json({
                    message: "Available seats must be a non-negative number"
                });
            }

            filter.availableSeats = {
                // Active ride listings must always have at least one seat,
                // even when the requested minimum is zero.
                $gt: 0,
                $gte: minimumSeats
            };
        }

        if (minPrice || maxPrice) {
            filter.price = {};

            if (minPrice) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        // Date filter
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);

            endDate.setDate(endDate.getDate() + 1);

            filter.date = {
                $gte: startDate,
                $lt: endDate
            };
        }


        const rides = await rideModel
            .find(filter)                           // find rides based on the filter
            .populate("creator", "name username")   // populate or display creator details with only name and username
            .sort({ date: 1, time: 1 });            // sort rides by date and time in ascending order

        // The status service normally marks expired rides as completed. This
        // application-side filter also hides them between service executions.
        const currentTime = new Date();
        const availableRides = rides.filter((ride) => {
            const rideDateTime = new Date(
                `${ride.date.toISOString().split("T")[0]}T${ride.time}`
            );

            return rideDateTime > currentTime;
        });

        return res.status(200).json({
            count: availableRides.length,
            rides: availableRides
        });


    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const getMyRidesController = async (req, res) => {
    try {
        // get only the rides created by the logged-in user
        // get the user id from the request object : It is set in the auth middleware after verifying the token
        const userId = req.user._id;

        // find all the rides created by the user 
        const rides = await rideModel.find({ creator: userId }).sort({ createdAt: -1 }); // sort rides by createdAt in descending order

        return res.status(200).json({
            count: rides.length,
            rides
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const getRideByIdController = async (req, res) => {
    try {
        const { id } = req.params;

        // Check whether ID has a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid ride ID"
            });
        }

        const ride = await rideModel
            .findById(id)
            .populate("creator", "name username")
            .populate("passengers", "name username");

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found"
            });
        }

        return res.status(200).json(ride);

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};


const updateRideController = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            from,
            destination,
            date,
            time,
            availableSeats,
            price
        } = req.body;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid ride ID"
            });
        }

        // Find the ride
        const ride = await rideModel.findById(id);

        if (!ride) {
            return res.status(404).json({
                message: "Ride not found"
            });
        }

        // Only the creator can update the ride
        if (ride.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "You are not authorized to update this ride"
            });
        }

        // Only active rides can be updated
        if (ride.status !== "active") {
            return res.status(400).json({
                message: "Only active rides can be updated"
            });
        }

        // Validate available seats
        const requestedAvailableSeats = availableSeats !== undefined
            ? Number(availableSeats)
            : undefined;

        if (availableSeats !== undefined && (isNaN(requestedAvailableSeats) || requestedAvailableSeats < 0)) {
            return res.status(400).json({
                message: "Available seats must be a non-negative number"
            });
        }

        // Do not let an update reduce the ride's remaining seat inventory
        // below the number of passengers already recorded on the ride. This
        // protects existing passengers from being made impossible by a later
        // capacity edit.
        const passengerCount = ride.passengers?.length ?? 0;
        if (requestedAvailableSeats !== undefined && requestedAvailableSeats < passengerCount) {
            return res.status(400).json({
                message: "Available seats cannot be less than the current passenger count"
            });
        }

        // Validate price
        if (price !== undefined && (isNaN(Number(price)) || Number(price) <= 0)) {
            return res.status(400).json({
                message: "Price must be greater than 0"
            });
        }

        // Use updated value if provided, otherwise existing value
        const updatedFrom = from ?? ride.from;
        const updatedDestination = destination ?? ride.destination;

        // Source and destination cannot be the same
        if (updatedFrom.trim().toLowerCase() === updatedDestination.trim().toLowerCase()) {
            return res.status(400).json({
                message: "Source and destination cannot be the same"
            });
        }

        // Validate updated date and time
        if (date !== undefined || time !== undefined) {

            // Convert existing date to YYYY-MM-DD format
            const existingDate = ride.date
                .toISOString()
                .split("T")[0];

            const updatedDate = date ?? existingDate;
            const updatedTime = time ?? ride.time;

            const rideDateTime = new Date(`${updatedDate}T${updatedTime}`);

            if (isNaN(rideDateTime.getTime())) {
                return res.status(400).json({
                    message: "Invalid date or time"
                });
            }

            if (rideDateTime <= new Date()) {
                return res.status(400).json({
                    message: "Ride date and time must be in the future"
                });
            }
        }

        // Update only fields that were actually provided
        if (from !== undefined) {
            ride.from = from;
        }

        if (destination !== undefined) {
            ride.destination = destination;
        }

        if (date !== undefined) {
            ride.date = date;
        }

        if (time !== undefined) {
            ride.time = time;
        }

        if (availableSeats !== undefined) {
            ride.availableSeats = requestedAvailableSeats;
        }

        if (price !== undefined) {
            ride.price = Number(price);
        }

        // Save updated ride
        await ride.save();

        return res.status(200).json({
            message: "Ride updated successfully",
            ride
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const cancelRideController = async (req, res) => {
    const { id } = req.params;

    // Validate the identifier before opening a database session.
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            message: "Invalid ride ID"
        });
    }

    const session = await mongoose.startSession();

    try {
        let cancelledRide;
        let cancelledBookingCount = 0;

        // Ride cancellation and booking cancellation must succeed or fail
        // together, otherwise users can retain confirmed bookings for a ride
        // that no longer exists as an active option.
        await session.withTransaction(async () => {
            const ride = await rideModel
                .findById(id)
                .session(session);

            if (!ride) {
                throw createHttpError(404, "Ride not found");
            }

            if (ride.creator.toString() !== req.user._id.toString()) {
                throw createHttpError(403, "You are not authorized to cancel this ride");
            }

            if (ride.status !== "active") {
                throw createHttpError(400, "Only active rides can be canceled");
            }

            ride.status = "cancelled";
            await ride.save({ session });

            // Cancel all confirmed bookings without changing the ride's seat
            // count, because a cancelled ride cannot be booked again.
            const bookingUpdate = await bookingModel.updateMany(
                {
                    ride: ride._id,
                    status: "confirmed"
                },
                {
                    $set: { status: "cancelled" }
                },
                { session }
            );

            cancelledRide = ride;
            cancelledBookingCount = bookingUpdate.modifiedCount;
        });

        return res.status(200).json({
            message: "Ride canceled successfully",
            ride: cancelledRide,
            cancelledBookingCount
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
    createRideController,
    getAllRidesController,
    getMyRidesController,
    getRideByIdController,
    updateRideController,
    cancelRideController
}
