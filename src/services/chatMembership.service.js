const mongoose = require("mongoose");
const userModel = require("../models/user.model");
const rideModel = require("../models/ride.model");
const bookingModel = require("../models/booking.model");

// The ride backend is the only place that decides whether a user can access
// a ride chat. The chat service receives only the result of this check.
const getChatMembership = async (rideId, userId) => {
    const ride = await rideModel
        .findById(rideId)
        .select("_id creator status date time");

    if (!ride) {
        return {
            found: false,
            allowed: false,
            rideStatus: null,
            bookingStatus: null,
            role: null
        };
    }

    const user = await userModel
        .findById(userId)
        .select("_id isBlacklisted");

    if (!user || user.isBlacklisted || ride.status !== "active") {
        return {
            found: true,
            allowed: false,
            rideStatus: ride.status,
            bookingStatus: null,
            role: null
        };
    }

    // The status job normally completes expired rides. This check also closes
    // the small window before the next job run.
    const rideDateTime = new Date(
        `${ride.date.toISOString().split("T")[0]}T${ride.time}`
    );

    if (Number.isNaN(rideDateTime.getTime()) || rideDateTime <= new Date()) {
        return {
            found: true,
            allowed: false,
            rideStatus: ride.status,
            bookingStatus: null,
            role: null
        };
    }

    if (ride.creator.toString() === userId.toString()) {
        return {
            found: true,
            allowed: true,
            rideStatus: ride.status,
            bookingStatus: null,
            role: "creator"
        };
    }

    const booking = await bookingModel
        .findOne({
            user: userId,
            ride: rideId,
            status: "confirmed"
        })
        .select("status");

    return {
        found: true,
        allowed: Boolean(booking),
        rideStatus: ride.status,
        bookingStatus: booking?.status || null,
        role: booking ? "passenger" : null
    };
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = {
    getChatMembership,
    isValidObjectId
};
