const express = require('express')
const router = express.Router()
const {
    getAllRanks,
    getRank,
    validateUpdateRequestBody,
    postUpdate,
    deleteUser,
} = require('../controllers/ranks.controller');
const rateLimit = require('express-rate-limit');
const { SecurityLogger } = require('../utils/securityLogger');

// Rate limiter: limit to 5 POST requests per minute per IP on /api/ranks
const ranksLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // More permissive in test
  message: { error: 'Too many requests, try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    SecurityLogger.logRateLimitExceeded(req, options.max, options.windowMs);
    res.status(429).json(options.message);
  }
});

// Conditional middleware for rate limiter (disabled in test)
const conditionalRateLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  return ranksLimiter(req, res, next);
};

// router.get('/ranks', getAllRanks);
router.get('/ranks/:hash', getRank);
router.post('/ranks', validateUpdateRequestBody, conditionalRateLimiter, postUpdate);
// router.delete('/ranks/:hash', deleteUser);

module.exports = router;