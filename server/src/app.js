const express = require('express')
const cors = require('cors')

const ranksRouter = require('./routes/ranks.route')

const app = express()

app.use(express.json())
app.use(cors());

app.get("/", function (req, res) {
    res.send("Hello World!");
});

app.use('/api', ranksRouter)

module.exports = app;