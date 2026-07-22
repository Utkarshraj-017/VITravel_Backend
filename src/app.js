const express = require("express");

const cors = require("cors");

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req,res)=>{

    res.send("VITravels Backend Running");

});

app.use("/api/auth", require("./routes/auth.routes"));

app.use("/api/rides", require("./routes/ride.routes"));

module.exports = app;