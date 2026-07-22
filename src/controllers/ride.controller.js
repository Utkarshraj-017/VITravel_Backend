const rideModel = require("../models/ride.model");
const mongoose = require("mongoose");

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

        if (availableSeats) {
            filter.availableSeats = {
                $gte: Number(availableSeats)
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
        if (availableSeats !== undefined && (isNaN(Number(availableSeats)) || Number(availableSeats) < 0)) {
            return res.status(400).json({
                message: "Available seats must be a non-negative number"
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
            ride.availableSeats = Number(availableSeats);
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
    try {
        const { id } = req.params;

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

        // Only the creator can cancel the ride
        if (ride.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "You are not authorized to cancel this ride"
            });
        }

        // Only active rides can be canceled
        if (ride.status !== "active") {
            return res.status(400).json({
                message: "Only active rides can be canceled"
            });
        }

        // Update the ride status to cancelled
        ride.status = "cancelled";
        await ride.save();

        return res.status(200).json({
            message: "Ride canceled successfully",
            ride
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
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