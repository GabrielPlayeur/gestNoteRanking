const express = require('express')
const mongoose = require('mongoose')
const app = express()

require('dotenv').config()
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
    .then((result) => {
      app.listen(5000, () => {
        console.log('Server is listening on port 5000')
    })})
    .catch((err) => console.log(err))

const rankingRouter = require('./routes/ranking')
const updateRouter = require('./routes/update')

app.get("/", function (req, res) {
  res.send("Hello World!");
});

app.use('/ranking', rankingRouter)
app.use('/update', updateRouter)