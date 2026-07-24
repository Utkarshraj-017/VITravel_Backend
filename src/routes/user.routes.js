const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Get logged-in user's profile
router.get("/users/me",authMiddleware,userController.getMyProfileController);

// Update logged-in user's profile
router.patch("/users/me",authMiddleware,userController.updateMyProfileController);

// Get another user's public profile
router.get("/users/:id",authMiddleware,userController.getUserByIdController);

module.exports = router;