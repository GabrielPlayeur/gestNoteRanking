async function postUpdate(req, res) {
    try {
        console.log(req.body.id)
        res.send(req.body)
    } catch (error) {
      res.status(500).send('Internal Server Error')
    }
  }

  module.exports = {
    postUpdate,
  }