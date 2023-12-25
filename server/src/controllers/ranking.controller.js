const ranksModel = require('../../db/models/ranks')

/**
 * It's an asynchronous function that uses the rank model to find all users and then
 * sends a response with the rank's data.
 * @param req - The request object.
 * @param res - The response object.
 */
const getAllRanks = async (req, res) => {
  try {
    const users = await ranksModel.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

/**
 * It's an asynchronous function that uses the rank model to find a user by its hash, and then
 * sends a response with the rank's data.
 * @param req - The request object.
 * @param res - The response object.
 */
const getRank = async (req, res) => {
  try {
    const hash = req.params.hash;
    const user = await ranksModel.findOne({hash: hash});
    if (user==null) {
      return res.status(404).json("The resource with the specified 'hash' was not found.");
    }
    const filter = {year: user.year, maquette: user.maquette, departement : user.departement};
    const result = await ranksModel.find(filter).sort({ grade: -1 });
    const userIndex = result.findIndex(u => u.hash === hash);
    res.status(200).json({ "rank": userIndex+1, "total": result.length });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

module.exports = {
  getRank,
  getAllRanks,
};