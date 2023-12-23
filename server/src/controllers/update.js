const ranksModel = require('../../db/models/ranks')
const { body, validationResult } = require('express-validator');

const validateUpdateRequestBody = [
  body('hash').isString().withMessage('Hash must be a string').notEmpty().withMessage('Hash is required'),
  body('year').isInt().withMessage('Year must be an integer').notEmpty().withMessage('Year is required'),
  body('maquette').isInt().withMessage('Maquette must be an integer').notEmpty().withMessage('Maquette is required'),
  body('departement').isInt().withMessage('Departement must be an integer').notEmpty().withMessage('Departement is required'),
  body('grade').isDecimal().withMessage('Grade must be a decimal number').notEmpty().withMessage('Grade is required'),
]

const postUpdate = async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hash, year, maquette, departement, grade } = req.body

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
  postUpdate, validateUpdateRequestBody
}