const bcrypt = require("bcrypt");
const crypto = require("crypto");

const EmailVerification = require("../models/emailVerification.model");
const transporter = require("../config/mail.config");


const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

 // Sends a 6-digit OTP to the given email.
async function sendOTP(email) {

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Hash and store it 
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Remove any previous OTP for this email
    await EmailVerification.deleteOne({ email });

    // Send the email
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your ViTravel Account",
        html: `
            <h2>Email Verification</h2>

            <p>Your OTP for verifying your ViTravel account is:</p>

            <h1 style="letter-spacing: 4px;">${otp}</h1>

            <p>This OTP is valid for <strong>5 minutes</strong>.</p>

            <p>If you didn't request this, you can safely ignore this email.</p>
        `
    });

    // Store the OTP only after the email is sent successfully
    await EmailVerification.create({
        email,
        otp: hashedOTP,
        verified: false,
        expiresAt: new Date(Date.now() + OTP_EXPIRY) 
    });
}

//---------------------------------------------------------------------------


 // Verifies the OTP sent to the user's email

async function verifyEmail(email, enteredOTP) {

    // Find the verification document
    const verification = await EmailVerification.findOne({ email });

    if (!verification) {
        throw new Error("OTP not found");
    }

    // Check if already verified
    if (verification.verified) {
        throw new Error("Email is already verified");
    }

    // Check OTP expiry
    if (verification.expiresAt <= new Date()) {

        // Remove expired OTP
        await EmailVerification.deleteOne({ email });

        throw new Error("OTP has expired");
    }

    // Compare entered OTP with stored hashed OTP
    const isValidOTP = await bcrypt.compare(
        enteredOTP,
        verification.otp
    );

    if (!isValidOTP) {
        throw new Error("Invalid OTP");
    }

    // Mark email as verified
    verification.verified = true;

    await verification.save();
}


// Checks whether an email has been verified.
async function isEmailVerified(email) {

    const verification = await EmailVerification.findOne({ email });

    return verification?.verified || false;
}


// Removes the verification record after successful registration. 
async function clearVerification(email) {
    await EmailVerification.deleteOne({ email });
}


module.exports = {
    sendOTP,
    verifyEmail,
    isEmailVerified,
    clearVerification
};