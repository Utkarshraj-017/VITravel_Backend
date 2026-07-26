const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");

async function authMiddleware(req, res, next) {
    try {

        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized access"
            });
        }

        // decoding the token to get the user ID and check user's validity and blacklist status
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        if (user.isBlacklisted) {
            return res.status(403).json({
                message: "User is blacklisted"
            });
        }
        // Attach the user object in the request for further use in the controllers
        req.user = user;

        next();

    } catch (err) {

        return res.status(401).json({
            message: "Unauthorized access"
        });

    }
}

module.exports = authMiddleware;