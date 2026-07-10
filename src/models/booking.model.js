const mongoose = require ("mongoose");

const bookingSchema = new mongoose.Schema ({
    user :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    ride :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ride",
        required:true
    },
    status:{
        type: String,
        enum:["completed","confirmed","cancelled"],
        default:"confirmed"
    },
},
{
    timestamps:true
    
});
module.exports = mongoose.model("Booking", bookingSchema);
