async function getRank(req, res) {
  try {
    res.send(req.params)
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
}

module.exports = {
  getRank,
}