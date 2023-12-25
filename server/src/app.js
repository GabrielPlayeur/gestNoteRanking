const express = require('express')
const cors = require('cors')

const rankingRouter = require('./routes/ranking')
const updateRouter = require('./routes/update')

const app = express()

app.use(express.json())
app.use(cors());


app.get("/", function (req, res) {
    res.send("Hello World!");
});

app.use('/ranking', rankingRouter)
app.use('/update', updateRouter)

module.exports = app;