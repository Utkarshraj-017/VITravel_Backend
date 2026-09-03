const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const chatServiceAuthMiddleware = require("../middlewares/chatServiceAuth.middleware");
const chatController = require("../controllers/chat.controller");

const router = express.Router();

// Browser-facing route. The ride backend decides whether the authenticated
// user is the creator or a confirmed passenger before issuing a chat token.
router.post(
    "/rides/:rideId/session",
    authMiddleware,
    chatController.createChatSessionController
);

// Service-to-service route. ouechat uses this before joining a room and before
// sending a message so cancellation and blacklist changes take effect quickly.
router.post(
    "/membership/validate",
    chatServiceAuthMiddleware,
    chatController.validateChatMembershipController
);

module.exports = router;
