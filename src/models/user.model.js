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
        select:false
    },
    email:{
        type: String,
        unique:true,
        trim:true,
        lowercase:true,
        //match:[/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,"Please fill a valid email address"]
    },
    phone:{
        type: String,
        default: null,
    },
    isBlacklisted:{
        type : Boolean,
        default : false,
    },
    // Incrementing this value invalidates all JWTs issued before the change.
    // It lets logout revoke bearer tokens as well as the HTTP-only cookie.
    tokenVersion: {
        type: Number,
        default: 0
    },
    reportCounter : {
        type : Number,
        default : 0
    },
    // // foreign key
    // associatedRides:[{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Ride"
    // }]

},
{
    timestamps:true
});

module.exports = mongoose.model("User", userSchema);
