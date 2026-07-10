const express = require("express");
const authController = require("../controllers/auth.controller");
const router = express.Router();

/* POST / api/auth/register */
router.post("/register", authController.registerController);

/* POST / api/auth/login */
router.post("/login", authController.loginController);

/* POST / api/auth/logout */
router.post("/logout", authController.logoutController);

module.exports = router;