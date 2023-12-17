const ranksModel = require('../../db/models/ranks')

const postUpdate = async (req, res) => {
  try {
    const hash = req.body.hash
    const year = req.body.year
    const maquette = req.body.maquette
    const departement = req.body.departement
    const grade = req.body.grade

    if (hash == undefined || year == undefined || maquette == undefined || departement == undefined || grade == undefined){
      res.status(500).send("Nope");
      return
    }

    const filter = {hash: hash, year: year, maquette: maquette, departement : departement};
    const doesUserExit = await ranksModel.exists(filter)

    if (doesUserExit) {
      const update = { grade: grade };
      const savedData = await ranksModel.findOneAndUpdate(filter, update, { new: true });
      res.status(200).json({ savedData });
      return
    }

    const newData = new ranksModel({
      hash: hash,
      year: year,
      maquette: maquette,
      departement : departement,
      grade: grade
    })
    const savedData = await newData.save();
    res.status(200).json({ savedData });

  } catch (error) {
    console.log(error)
    res.status(500).send('Internal Server Error')
  }
}

module.exports = {
  postUpdate
}