const express = require('express')
const router = express.Router()
const updateController = require('../controllers/update')

router.post('/', updateController.postUpdate)

module.exports = router