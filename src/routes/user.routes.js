const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// GET api/user/me
router.get("/me",authMiddleware,userController.getMyProfileController);

// Update logged-in user's profile
// PATCH api/user/me
router.patch("/me",authMiddleware,userController.updateMyProfileController);

// Get another user's public profile
// GET api/user/:id
router.get("/:id",authMiddleware,userController.getUserByIdController);

module.exports = router;