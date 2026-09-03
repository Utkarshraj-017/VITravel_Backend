const express = require("express");

const cors = require("cors");

const cookieParser = require("cookie-parser");

const app = express();

// Render places one reverse proxy in front of this application and forwards
// the original client IP in X-Forwarded-For. Trust exactly that one hop so
// Express and express-rate-limit can identify clients correctly without
// trusting an arbitrary proxy chain.
app.set("trust proxy", 1);

const localOrigins = [
    "http://localhost:3000",
    "http://localhost:5173"
];

const configuredFrontendOrigin = process.env.FRONTEND_URL;

app.use(cors({
    // Allow the local frontend during development and only the configured
    // frontend origin in production. Requests without an Origin header (for
    // example server-to-server calls) are allowed as well.
    origin: (origin, callback) => {
        const isDevelopment = process.env.NODE_ENV !== "production";
        const isAllowed = !origin ||
            (isDevelopment && localOrigins.includes(origin)) ||
            origin === configuredFrontendOrigin;

        callback(null, isAllowed);
    },
    credentials: true,
}));

app.use(express.json());

app.use(cookieParser());

app.get("/", (req,res)=>{

    res.send("VITravels Backend Running");

});

app.use("/api/auth", require("./routes/auth.routes"));

app.use("/api/rides", require("./routes/ride.routes"));

app.use("/api/user", require("./routes/user.routes"));

app.use("/api/bookings", require("./routes/booking.routes"));

app.use("/api/chat", require("./routes/chat.routes"));


module.exports = app;
