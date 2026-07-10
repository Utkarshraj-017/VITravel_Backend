const express = require("express");
const authController = require("../controllers/auth.controller");
const router = express.Router();

const { otpLimiter,loginLimiter} = require("../middlewares/rateLimiter.middleware");


/* POST / api/auth/send-otp */
router.post("/send-otp", otpLimiter, authController.sendOTPController);

/* POST / api/auth/verify-otp */
router.post("/verify-otp", authController.verifyOTPController);

/* POST / api/auth/register */
router.post("/register", authController.registerController);

/* POST / api/auth/login */
router.post("/login", loginLimiter, authController.loginController);

/* POST / api/auth/logout */
router.post("/logout", authController.logoutController);

module.exports = router;