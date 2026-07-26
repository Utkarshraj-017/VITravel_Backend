const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const otpAuth = require("../services/otpAuth.service");

const cookieOptions = {
    httpOnly: true,                                // Hide cookie from frontend JS
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict",                            // CSRF protection
    maxAge: 2 * 24 * 60 * 60 * 1000                // 2 days expiry
}

/** 
 * - send OTP controller
 * - POST /api/auth/send-otp
 */

async function sendOTPController(req, res) {
    try {

        const { email } = req.body;

        const normalizedEmail = email?.trim().toLowerCase();

        if (!normalizedEmail) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!normalizedEmail.endsWith("@vitbhopal.ac.in")) {
            return res.status(400).json({
                message: "Only VIT Bhopal email addresses are allowed"
            });
        }
        const existingUser = await userModel.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "Email is already registered"
            });
        }

        await otpAuth.sendOTP(normalizedEmail);

        return res.status(200).json({
            message: "OTP sent successfully"
        });
    } 
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

/** 
 * - verify OTP controller
 * - POST /api/auth/verify-otp
 */

async function verifyOTPController(req, res) {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();

        if (!normalizedEmail || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required"
            });
        }

        await otpAuth.verifyEmail(normalizedEmail, otp);

        return res.status(200).json({
            message: "Email verified successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({
            message: error.message
        });
    }
}

/** 
 * - user register controller
 * - POST /api/auth/register
 */

async function registerController(req, res) {
    try {
        const { name, username, password, email, phone } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();

        if (!name || !username || !password || !normalizedEmail || !phone) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // check if user already exists with the same username or email or phone number
        const existingUser = await userModel.findOne({
            $or: [
                { username },
                { phone },
                { email : normalizedEmail }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // Check if the email was verified
        const isVerified = await otpAuth.isEmailVerified(normalizedEmail);
        if (!isVerified) {
            return res.status(400).json({
                message: "Email is not verified"
            });
        }

        // create new user

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            username,
            password: hashedPassword,
            phone,
            email : normalizedEmail,
            name
        });

        // Clear the verification status after successful registration : so it cant be reused for another registration
        await otpAuth.clearVerification(normalizedEmail);


        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "2d" }
        );

        // Good practice 
        res.cookie("token", token, cookieOptions);

        return res.status(201).json({
            message: "User registered successfully",
            status: "success",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

/**
 * - User Login Controller
 * - POST /api/auth/login
  */

async function loginController(req, res) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const user = await userModel.findOne({ username }).select('+password');

        if (!user) {
            return res.status(401).json({
                message: "Username or password is INVALID"
            });
        }

        // Comparing the provided password with hashed db password.
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                message: "Username or password is INVALID"
            })
        }
        // If email and password are valid then generate a JWT token and send it in response.
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "2d" }
        );

        // Good practice 
        res.cookie("token", token, cookieOptions);

        return res.status(200).json({
            message: "Login successful",
            status: "success",
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

/**
 * - User Logout Controller
 * - POST /api/auth/logout
  */
async function logoutController(req, res) {
    // Check if user is logged in by retrieving token
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]
    // if user token doesn't exist - logout
    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }
    res.clearCookie("token", cookieOptions);
    return res.status(200).json({
        message: "User logged out successfully"
    })

}


module.exports = {
    sendOTPController,
    verifyOTPController,
    registerController,
    loginController,
    logoutController
}