const express = require('express')
const router = express.Router()
const rankingController = require('../controllers/ranking')

router.get('/:userId', rankingController.getRank)

module.exports = router