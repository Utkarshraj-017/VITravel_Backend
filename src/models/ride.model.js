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
        required:true,
        min:0            // It should be verified that min 1 while ride creation, but when all seats are booked it will be 0.
    },
    status:{
        type: String,
        enum:["active","completed","cancelled"],
        default:"active"
    },
    price:{
        type: Number,
        required:true,
        min:0
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