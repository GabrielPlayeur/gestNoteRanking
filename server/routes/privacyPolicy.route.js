const express = require('express')
const router = express.Router()
const {
    getPrivacyPolicy,
} = require('../controllers/privacyPolicy.controller');

router.get("/", getPrivacyPolicy);

module.exports = router;