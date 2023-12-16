const ranksModel = require('../../db/models/ranks')
const { head } = require('../routes/ranking')

const postUpdate = async (req, res) => {
  try {
    const hash = req.body.hash
    const year = req.body.year
    const semester = req.body.semester
    const average = req.body.average

    console.log(hash,year, semester, average)

    if (hash == undefined || year == undefined || semester == undefined || average == undefined){
      res.status(200).send("Nope");
      return
    }

    const newData = new ranksModel({
      hash: hash,
      year: year,
      semester: semester,
      average: average
    })
    const savedData = await newData.save();

    res.status(200).json({ savedData });
  } catch (error) {
    res.status(500).send('Internal Server Error')
  }
}

module.exports = {
  postUpdate,
}