const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        required:true,
        unique:true,
        trim:true
    },
    name:{
        type: String,
        required:true,
        trim:true
    },
    password:{
        type: String,
        required:true,
    },
    phone:{
        type: Number,
        required:true,
        unique:true
    },
    isBlacklisted:{
        type : Boolean,
        default : false,
    },
    reportCounter : {
        type : Number,
        default : 0
    },
    // foreign key
    associatedRides:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ride"
    }]

},
{
    timestamps:true
});

module.exports = mongoose.model("User", userSchema);