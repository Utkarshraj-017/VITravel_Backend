require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

const connectDB = require('./src/config/db');

connectDB();

app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

});