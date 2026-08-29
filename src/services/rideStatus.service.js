const rideModel = require("../models/ride.model");
const bookingModel = require("../models/booking.model");
const mongoose = require("mongoose");

// Move expired active rides to completed. The status condition prevents
// cancelled rides from being overwritten as completed.
const completeExpiredRides = async () => {
    const activeRides = await rideModel
        .find({ status: "active" })
        .select("_id date time")
        .lean();
    const currentTime = new Date();

    const expiredRides = activeRides.filter((ride) => {
        const rideDateTime = new Date(
            `${ride.date.toISOString().split("T")[0]}T${ride.time}`
        );

        return !Number.isNaN(rideDateTime.getTime()) && rideDateTime <= currentTime;
    });
    const expiredRideIds = expiredRides.map((ride) => ride._id);

    if (expiredRideIds.length === 0) {
        return { modifiedCount: 0 };
    }

    const session = await mongoose.startSession();
    let completedRideCount = 0;
    let completedBookingCount = 0;

    try {
        // Ride completion and booking completion must be committed together.
        // Otherwise a failure between the two writes leaves the ride and its
        // bookings reporting different lifecycle states.
        await session.withTransaction(async () => {
            for (const expiredRide of expiredRides) {
                // Recheck the original date/time as well as status. If the
                // creator rescheduled the ride while this job was running,
                // this update will not complete the newly scheduled ride.
                const completedRide = await rideModel.findOneAndUpdate(
                    {
                        _id: expiredRide._id,
                        status: "active",
                        date: expiredRide.date,
                        time: expiredRide.time
                    },
                    {
                        $set: { status: "completed" }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!completedRide) {
                    continue;
                }

                const bookingUpdate = await bookingModel.updateMany(
                    {
                        ride: expiredRide._id,
                        status: "confirmed"
                    },
                    {
                        $set: { status: "completed" }
                    },
                    { session }
                );

                completedRideCount += 1;
                completedBookingCount += bookingUpdate.modifiedCount;
            }
        });
    } finally {
        await session.endSession();
    }

    if (completedRideCount > 0) {
        console.log(`${completedRideCount} ride(s) marked as completed`);
    }

    return {
        modifiedCount: completedRideCount,
        bookingModifiedCount: completedBookingCount
    };
};

// Start the periodic status check after the database connection is ready.
const startRideStatusService = async () => {
    await completeExpiredRides();

    // Run once per minute. The immediate run above also handles rides that
    // expired while the server was offline.
    const interval = setInterval(() => {
        completeExpiredRides().catch((error) => {
            console.error("Failed to complete expired rides:", error);
        });
    }, 60 * 1000);

    // The HTTP server keeps the process alive; this avoids the timer alone
    // preventing graceful process shutdown in scripts and tests.
    interval.unref?.();

    return interval;
};

module.exports = {
    completeExpiredRides,
    startRideStatusService
};
