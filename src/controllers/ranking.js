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
    const result = await ranksModel.find({hash: hash});

    res.status(200).json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: error.message });
  }
};

module.exports = {getRank, getAllRank}