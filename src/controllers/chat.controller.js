const jwt = require("jsonwebtoken");
const {
    getChatMembership,
    isValidObjectId
} = require("../services/chatMembership.service");

const CHAT_TOKEN_TTL_SECONDS = 5 * 60;

const createChatSessionController = async (req, res) => {
    try {
        const { rideId } = req.params;

        if (!isValidObjectId(rideId)) {
            return res.status(400).json({
                message: "Invalid ride ID"
            });
        }

        const membership = await getChatMembership(rideId, req.user._id);

        if (!membership.found) {
            return res.status(404).json({
                message: "Ride not found"
            });
        }

        if (!membership.allowed) {
            return res.status(403).json({
                message: "You are not allowed to access this ride chat"
            });
        }

        if (!process.env.CHAT_TOKEN_SECRET) {
            return res.status(500).json({
                message: "Chat service is not configured"
            });
        }

        const userId = req.user._id.toString();
        const chatToken = jwt.sign(
            {
                sub: userId,
                rideId,
                role: membership.role
            },
            process.env.CHAT_TOKEN_SECRET,
            {
                audience: "ouechat",
                expiresIn: CHAT_TOKEN_TTL_SECONDS
            }
        );

        return res.status(200).json({
            roomId: `ride:${rideId}`,
            rideId,
            userId,
            role: membership.role,
            chatToken,
            expiresAt: new Date(
                Date.now() + CHAT_TOKEN_TTL_SECONDS * 1000
            ).toISOString()
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

const validateChatMembershipController = async (req, res) => {
    try {
        const { rideId, userId } = req.body;

        if (!isValidObjectId(rideId) || !isValidObjectId(userId)) {
            return res.status(400).json({
                message: "Valid rideId and userId are required"
            });
        }

        const membership = await getChatMembership(rideId, userId);

        if (!membership.found) {
            return res.status(404).json({
                message: "Ride not found"
            });
        }

        return res.status(200).json({
            allowed: membership.allowed,
            role: membership.role,
            rideStatus: membership.rideStatus,
            bookingStatus: membership.bookingStatus
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createChatSessionController,
    validateChatMembershipController
};
