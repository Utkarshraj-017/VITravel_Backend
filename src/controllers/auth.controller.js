const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const otpAuth = require("../services/otpAuth.service");

/** 
 * - user register controller
 * - POST /api/auth/register
 */

async function registerController(req, res) {
    try {
        const { name, username , password , phone} = req.body;    

        // check if user already exists with the same username or phone number
        const existingUser = await userModel.findOne({
            $or: [
                { username },
                { phone }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // else : create new user

        // step 1 : use otp verification service to verify the phone number
        await otpAuth.service.verifyPhoneNumber(phone);

        // else : create new user

        // step 1 : use otp verification service to verify the phone number
        await otpAuth.sendOTP(phone);
        await otpAuth.service.verifyPhoneNumber(phone);
        // step 2 : hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // step 3 : create new user and generate jwt token
        const user = await userModel.create({
            username,
            password: hashedPassword,
            phone,
            name
        });

        const token = jwt.sign(
            {userId: user._id}, 
            process.env.JWT_SECRET, 
            {expiresIn: "2d"}
        );

        // Good practice 
        res.cookie("token", token, {
             httpOnly: true,                                // Hide cookie from frontend JS
             secure: process.env.NODE_ENV === "production", // HTTPS only in production
             sameSite: "strict",                            // CSRF protection
             maxAge: 172800000                              // 2 days expiry
        });

        res.status(201).json({
            message: "User registered successfully",
            status: "success",
            token
        });

    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        });
    }
}