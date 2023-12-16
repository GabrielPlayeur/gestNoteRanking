const express = require('express')
const app = express()

const rankingRouter = require('./routes/ranking')
const updateRouter = require('./routes/update')

app.use(express.json())

app.get("/", function (req, res) {
  res.send("Hello World!");
});

app.use('/ranking', rankingRouter)
app.use('/update', updateRouter)

app.listen(3000, () => {
  console.log('Server is listening on port 3000')
})