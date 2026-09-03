const rateLimit = require("express-rate-limit");

// Limit OTP requests
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,                   // Max 50 requests
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many OTP requests. Please try again after 15 minutes."
    }
});

// Limit OTP verification attempts separately from OTP sending. Without this
// limiter an attacker could make unlimited guesses against one OTP.
const verifyOTPLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,                   // Max 50 verification attempts per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many OTP verification attempts. Please try again later."
    }
});

// Limit login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many login attempts. Please try again later."
    }
});

module.exports = {
    otpLimiter,
    verifyOTPLimiter,
    loginLimiter
};
