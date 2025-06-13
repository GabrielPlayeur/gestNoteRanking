const mongoose = require('mongoose');
const app = require("./app");

// Check if logs folder exists, create it if not
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, './logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

require('dotenv').config();

mongoose
  .connect(process.env.MONGO_URI)
  .then((result) => {
      app.listen(5000, console.log('Server is listening at http://127.0.0.1:5000'));
  })
  .catch((err) => console.log(err));