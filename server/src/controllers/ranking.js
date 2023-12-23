const ranksModel = require('../../db/models/ranks')

const getAllRank = async (req, res) => {
  try {

    const result = await ranksModel.find({});

    res.status(200).json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: error.message });
  }
};

const getRank = async (req, res) => {
  try {
    const hash = req.params.hash
    const user = await ranksModel.findOne({hash: hash});

    if (user==null) {
      res.status(404).json("The resource with the specified 'hash' was not found.");
      return
    }

    const filter = {year: user.year, maquette: user.maquette, departement : user.departement};
    const result = await ranksModel.find(filter).sort({ grade: -1 });
    const userIndex = result.findIndex(u => u.hash === hash);

    res.status(200).json({ "rank": userIndex+1, "total": result.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: error.message });
  }
};

module.exports = {getRank, getAllRank}