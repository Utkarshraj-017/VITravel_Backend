const express = require("express");

const cors = require("cors");

const cookieParser = require("cookie-parser");

const app = express();

const frontendOrigin =  process.env.FRONTEND_URL || "http://localhost:3000"; 

app.use(cors({
    origin: frontendOrigin,
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


module.exports = app;
