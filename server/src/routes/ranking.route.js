const express = require('express')
const router = express.Router()
const rankingController = require('../controllers/ranking')

router.get('/', rankingController.getAllRanks)
router.get('/:hash', rankingController.getRank)

module.exports = router