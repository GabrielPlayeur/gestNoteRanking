const express = require('express')
const router = express.Router()
const updateController = require('../controllers/update')

router.post('/', updateController.validateUpdateRequestBody, updateController.postUpdate)

module.exports = router