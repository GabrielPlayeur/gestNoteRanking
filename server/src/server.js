const mongoose = require('mongoose');
const app = require("./app");

require('dotenv').config()

mongoose
  .connect(process.env.MONGO_URI)
  .then((result) => {
      app.listen(5000, console.log('Server is listening on port 5000'));
  })
  .catch((err) => console.log(err));