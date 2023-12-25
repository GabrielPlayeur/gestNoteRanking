const ranksModel = require('../../db/models/ranks')
const { body, validationResult } = require('express-validator');

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { hash, year, maquette, departement, grade } = req.body;
    const filter = {hash: hash, year: year, maquette: maquette, departement : departement};
    const doesUserExit = await ranksModel.exists(filter);
    if (doesUserExit) {
      const savedData = await updateUser(grade, filter);
      return res.status(200).json(savedData);
    }
    const savedData = await createUser(hash, year, maquette, departement, grade);
    res.status(200).json({ savedData });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
}

/**
 * It takes the grade of the user to be updated from the filter,and the updated user data from the filter,
 * and then updates the user in the database with the new data, and returns the updated user.
 * @param grade - The new grade.
 * @param filter - The data to reconize the user.
 */
async function updateUser(grade, filter) {
  const update = { grade: grade };
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
    grade: grade
  });
  const savedData = await newData.save();
  return savedData;
}

module.exports = {
  postUpdate,
  validateUpdateRequestBody,
};