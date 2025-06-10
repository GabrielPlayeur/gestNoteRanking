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

// Rate limiter : limite à 5 requêtes POST par minute par IP sur /api/ranks
const ranksLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // Plus permissif en test
  message: { error: 'Trop de requêtes, réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    SecurityLogger.logRateLimitExceeded(req, options.max, options.windowMs);
    res.status(429).json(options.message);
  }
});

// Middleware conditionnel pour le rate limiter (désactivé en test)
const conditionalRateLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  return ranksLimiter(req, res, next);
};

router.get('/ranks', getAllRanks);
router.get('/ranks/:hash', getRank);
router.post('/ranks', validateUpdateRequestBody, conditionalRateLimiter, postUpdate);
router.delete('/ranks/:hash', deleteUser);

module.exports = router;