const rateLimit = require("express-rate-limit");

// Limit OTP requests
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,                   // Max 5 requests
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many OTP requests. Please try again after 15 minutes."
    }
});

// Limit login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many login attempts. Please try again later."
    }
});

module.exports = {
    otpLimiter,
    loginLimiter
};