const express = require("express");
const rideController = require("../controllers/ride.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/ride",authMiddleware,rideController.createRideController);

router.get("/rides",authMiddleware,rideController.getAllRidesController);

router.get("/rides/my-rides",authMiddleware,rideController.getMyRidesController);

router.get("/rides/:id",authMiddleware,rideController.getRideByIdController);

router.patch("/rides/:id",authMiddleware,rideController.updateRideController);

router.patch("/rides/:id/cancel",authMiddleware,rideController.cancelRideController);


module.exports = router;