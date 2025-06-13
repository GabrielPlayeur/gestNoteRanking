const express = require('express')
const router = express.Router()
const {
    getAllRanks,
    getRank,
    validateUpdateRequestBody,
    postUpdate,
    deleteUser,
} = require('../controllers/ranks.controller');

// router.get('/ranks', getAllRanks);
router.get('/ranks/:hash', getRank);
router.post('/ranks', validateUpdateRequestBody, conditionalRateLimiter, postUpdate);
// router.delete('/ranks/:hash', deleteUser);

module.exports = router;