const mongoose = require ("mongoose");

const rideSchema = new mongoose.Schema({
    creator:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    from:{
        type: String,
        required:true,
        trim:true
    },
    destination:{
        type: String,
        required:true,
        trim:true
    },
    date:{
        type: Date,
        required:true
    },
    time:{
        type: String,
        required:true   
    },
    availableSeats:{
        type: Number,
        required:true
    },
    passengers:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
},
{
    timestamps:true
});
module.exports = mongoose.model("Ride", rideSchema);