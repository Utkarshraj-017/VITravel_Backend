# VITravels Ride Backend and Chat Service Integration

This document is the integration contract for the future chatroom microservice.
The chat service is a separate application with its own MongoDB database and
Socket.IO server. It must never read the ride backend database directly.

## 1. Current ride backend structure

The backend is an Express application.

- Application setup: `src/app.js`
- Process entry point: `server.js`
- Existing routes: `src/routes/`
- Authentication middleware: `src/middlewares/auth.middleware.js`
- Ride model: `src/models/ride.model.js`
- Booking model: `src/models/booking.model.js`
- Ride lifecycle service: `src/services/rideStatus.service.js`

When chat routes are added, they should be created at:

```text
src/routes/chat.routes.js
```

and mounted in `src/app.js` as:

```js
app.use("/api/chat", require("./routes/chat.routes"));
```

The backend currently has no event bus, queue, webhook system, or outbox
pattern. The existing HTTP client convention is native `fetch`.

## 2. Authentication and identity

Protected ride-backend routes use the existing authentication middleware. It
accepts either:

- the HTTP-only `token` cookie, or
- an `Authorization: Bearer <token>` header.

After authentication, the user document is placed on:

```js
req.user
```

The authenticated user ID is:

```js
req.user._id
```

The chat service must never trust a `userId` supplied by the browser. The
identity must come from a token verified by the ride backend or by a
ride-backend-issued, short-lived chat credential.

The regular ride JWT contains `userId` and `tokenVersion`. Logout increments
the user's token version, which revokes previously issued ride JWTs. The chat
service must not independently interpret the ride JWT unless an explicit
shared-secret contract is added; a chat-specific credential is safer.

## 3. Source of truth for membership

The ride backend owns membership. The chat service owns chat rooms, messages,
Socket.IO connections, and chat persistence.

A user is currently allowed to participate in a ride chat when either:

1. the user is the ride creator (`ride.creator === req.user._id`) and the ride
   is `active`, or
2. the user has a booking for that ride with status `confirmed` and the ride
   is `active`.

The `Ride.passengers` array is useful for ride data, but booking status is the
authoritative membership check. The ride creator does not automatically have a
booking document, so creator access must be checked separately.

The relevant booking statuses are:

```text
confirmed  -> active membership
cancelled  -> no membership
completed  -> no live membership
```

Blacklisted users are rejected by the ride backend authentication middleware.
The chat service must also reject access whenever the ride backend reports the
membership as inactive.

## 4. Ride and booking lifecycle effects

The chat service should make room operations idempotent and follow these
transitions:

| Ride-backend event | Ride-backend state | Required chat behavior |
| --- | --- | --- |
| Ride created | `active` | Room may be created lazily or provisioned once. |
| Booking created/reactivated | booking `confirmed` | Passenger may join the room. |
| Booking cancelled | booking `cancelled` | Passenger must be denied on the next validation and removed from active room access. |
| Ride cancelled | ride `cancelled`; confirmed bookings become `cancelled` | Close or lock the room and deny new joins. |
| Ride time passes | ride `completed`; confirmed bookings become `completed` | Deny live participation; retain history according to chat retention policy. |
| Cancelled booking reactivated | booking `confirmed` | Restore access if the ride is still `active`. |

There is no separate leave-ride or participant service in this backend.
Booking cancellation is the leave operation.

Because this backend currently has no event bus or outbox, the first chat
integration should validate membership against the ride backend when a socket
connects and whenever a client joins a ride room. Do not assume that hiding a
frontend chat button revokes access.

## 5. Recommended integration boundary

The recommended future ride-backend API is:

```text
POST /api/chat/rides/:rideId/session
```

This route should use the existing `authMiddleware`, validate the ride ID,
load the ride and booking from this backend, and return a short-lived
chat-specific session credential only for an allowed member.

Suggested success shape:

```json
{
  "roomId": "ride:<rideId>",
  "rideId": "<rideId>",
  "userId": "<authenticated-user-id>",
  "role": "creator",
  "chatToken": "<short-lived-chat-service-token>",
  "expiresAt": "< ISO timestamp >"
}
```

The role should be `creator` or `passenger`. The `chatToken` should be signed
for the chat service with a chat-specific secret, have a short lifetime, and
include at least `sub` (user ID), `rideId`, `role`, `aud` (`chat-service`), and
`exp`.

For immediate revocation after cancellation, the chat service should also be
able to call a protected internal membership-validation endpoint on the ride
backend, for example:

```text
POST /internal/chat/membership/validate
```

Suggested request:

```json
{
  "rideId": "<rideId>",
  "userId": "<userId>"
}
```

This internal route must use service-to-service authentication, not browser
authentication. It should return `allowed`, `role`, and the current ride and
booking statuses. The exact internal route can be finalized when the chat
service is built, but the membership decision must remain in this backend.

## 6. Socket.IO rules for the chat service

- Use a deterministic room ID such as `ride:<rideId>`.
- Validate the chat credential before accepting a Socket.IO connection.
- Validate ride membership before every room join.
- Derive the sender ID from the verified socket credential, never from the
  message body.
- Do not allow a client to choose an arbitrary room name.
- Do not treat a hidden or disabled frontend button as authorization.
- On cancellation or completion, prevent new joins and disconnect or block
  active members according to the product's retention policy.
- Do not add Redis just for this integration. A single chat service instance
  can use the existing Socket.IO setup; a future multi-instance deployment
  would need a separately approved scaling design.

## 7. Database and environment boundaries

The chat service must have its own MongoDB URI and collections. It must not
use `MONGODB_URI` from this backend, import these Mongoose models, or query
ride-backend collections.

The ride backend currently uses:

```env
PORT=5000
MONGODB_URI=<ride-backend-mongodb-uri>
JWT_SECRET=<ride-backend-jwt-secret>
EMAIL_USER=<otp-sender-email>
BREVO_API_KEY=<brevo-api-key>
```

The chat service should use separate names, credentials, and secrets, for
example:

```env
CHAT_PORT=4000
CHAT_MONGODB_URI=<chat-service-mongodb-uri>
CHAT_SERVICE_SECRET=<service-to-service-secret>
CHAT_TOKEN_SECRET=<chat-token-signing-secret>
RIDE_BACKEND_URL=http://localhost:5000
```

Never commit real values and never expose service secrets to the frontend.

## 8. Error and validation conventions

Chat-facing ride-backend routes should follow the existing conventions:

| Condition | Response |
| --- | --- |
| Missing or invalid authentication | `401` |
| Valid user but not a current member | `403` |
| Invalid MongoDB ride ID | `400` |
| Ride does not exist | `404` |
| Malformed request body | `400` |
| Chat service unavailable | `502` when this backend is proxying a chat request |

Use JSON responses with a `message` field for errors. Do not expose database
errors, secrets, passwords, or raw internal credentials.

## 9. Required integration test cases

Before enabling chat in the frontend, test at least:

1. ride creator can obtain chat access;
2. confirmed passenger can obtain chat access;
3. unrelated authenticated user receives `403`;
4. cancelled booking receives `403`;
5. completed booking receives `403` for live chat;
6. cancelled ride denies new access;
7. rebooked passenger regains access;
8. blacklisted user cannot obtain access;
9. expired or revoked ride credentials are rejected;
10. cancellation and room join occurring concurrently never grants access to a
    cancelled member;
11. no chat endpoint can read or modify the chat database through the ride
    backend's MongoDB connection.

The ride backend remains the final authority for every allow/deny membership
decision.
