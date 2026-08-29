require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const transporter = require("./src/config/mail.config");
const { startRideStatusService } = require("./src/services/rideStatus.service");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // 1. Connect to database
        await connectDB();

        // 2. Start automatic completion for expired rides.
        await startRideStatusService();
        
        // 3. Verify mail service : no needed as Resend handles this internally
        // await transporter.verify();
        // console.log("Mail server is ready.");

        // 4. Start accepting requests only after dependencies are ready
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error);
        process.exit(1);
    }
};

startServer();
