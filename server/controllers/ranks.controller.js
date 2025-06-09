const ranksModel = require('../models/ranks.model')
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

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

const validateUpdateRequestBody = [
  body('hash').isString().withMessage('Hash must be a string').notEmpty().withMessage('Hash is required'),
  body('year').isInt().withMessage('Year must be an integer').notEmpty().withMessage('Year is required'),
  body('maquette').isInt().withMessage('Maquette must be an integer').notEmpty().withMessage('Maquette is required'),
  body('departement').isInt().withMessage('Departement must be an integer').notEmpty().withMessage('Departement is required'),
  body('grade').isDecimal().withMessage('Grade must be a decimal number').notEmpty().withMessage('Grade is required'),
]

/**
 * It takes the hash of the user to be updated (or create if he doesn't exist) from the request params,
 * and the updated user data from the request body, and then updates the user in the database with
 * the new data, and returns the updated user.
 * @param req - The request object.
 * @param res - The response object.
 */
const postUpdate = async (req, res) => {
  try {
    const HMAC_SECRET = process.env.GESTNOTE_SECRET;
    if (!HMAC_SECRET) {
      console.error('HMAC_SECRET is undefined!');
      return res.status(500).json({ error: 'Server HMAC secret misconfigured' });
    }
    const signature = req.get('X-GestNote-Signature');
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Signature HMAC invalide' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { hash, year, maquette, departement, grade } = req.body;
    if ( isNaN(year) || isNaN(maquette) || isNaN(departement) || isNaN(grade) ||
      Number(grade) < 0 || Number(grade) > 20
    ) {
      return res.status(400).json({ error: "Invalid data" });
    }    const filter = {hash: hash, year: year, maquette: maquette, departement : departement};
    const doesUserExit = await ranksModel.exists(filter);
    let savedData;
    if (doesUserExit) {
      savedData = await updateUser(grade, filter);
    } else {
      savedData = await createUser(hash, year, maquette, departement, grade);
    }
    const rankFilter = {year: year, maquette: maquette, departement: departement};
    const result = await ranksModel.find(rankFilter).sort({ grade: -1 });
    const userIndex = result.findIndex(u => u.hash === hash);
    const rankData = { 
      rank: userIndex + 1, 
      total: result.length,
      user: savedData
    };
    if (doesUserExit) {
      return res.status(200).json(rankData);
    }
    res.status(201).json(rankData);
  } catch (error) {
    console.error('POST /api/ranks error:', error);
    res.status(500).send({ msg: error.message });
  }
}

/**
 * It takes the grade of the user to be updated from the filter,and the updated user data from the filter,
 * and then updates the user in the database with the new data, and returns the updated user.
 * @param grade - The new grade.
 * @param filter - The data to reconize the user.
 */
async function updateUser(grade, filter) {
  const update = { grade: grade, updatedAt: Date.now() };
  const savedData = await ranksModel.findOneAndUpdate(filter, update, { new: true });
  return savedData;
}

/**
 * It creates a new user using the data from the param and returns the created user in the response.
 * @param hash - The user's hash
 * @param year - The semester's year
 * @param maquette - The semester's id
 * @param departement - The departement's id
 * @param grade - The user semester's grade
 */
async function createUser(hash, year, maquette, departement, grade) {
  const newData = new ranksModel({
    hash: hash,
    year: year,
    maquette: maquette,
    departement : departement,
    grade: grade,
    updatedAt: Date.now(),
  });
  const savedData = await newData.save();
  return savedData;
}

const deleteUser = async (req, res) => {
  try {
    const user = await ranksModel.findOneAndDelete({hash: req.params.hash});
    res.status(200).json(user);
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
}

module.exports = {
  getRank,
  getAllRanks,
  postUpdate,
  validateUpdateRequestBody,
  deleteUser,
};