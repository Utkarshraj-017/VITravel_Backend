const crypto = require("crypto");

// Protects the membership endpoint used only by ouechat. Browser clients must
// use the normal authenticated chat-session route instead.
const chatServiceAuthMiddleware = (req, res, next) => {
    const expectedSecret = process.env.CHAT_SERVICE_SECRET;
    const receivedSecret = req.headers["x-chat-service-secret"];

    if (!expectedSecret || typeof receivedSecret !== "string") {
        return res.status(401).json({
            message: "Chat service authentication required"
        });
    }

    const expectedBuffer = Buffer.from(expectedSecret);
    const receivedBuffer = Buffer.from(receivedSecret);

    if (
        expectedBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
        return res.status(403).json({
            message: "Invalid chat service credentials"
        });
    }

    next();
};

module.exports = chatServiceAuthMiddleware;
