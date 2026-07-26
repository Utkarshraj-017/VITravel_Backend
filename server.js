require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const connectDB = require('./src/config/db');

connectDB();

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});

//-----------------------------------------------------------------------------------

const transporter = require("./src/config/mail.config");

transporter.verify((error) => {
    if (error) {
        console.error("Mail server connection failed:", error);
    } else {
        console.log("Mail server is ready.");
    }
});