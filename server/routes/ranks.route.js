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

// Rate limiter : limite à 5 requêtes POST par minute par IP sur /api/ranks
const ranksLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Trop de requêtes, réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware conditionnel pour le rate limiter (désactivé en test)
const conditionalRateLimiter = (req, res, next) => {
  // En environnement de test, on n'applique pas le rate limiter
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  // Sinon on applique le rate limiter normalement
  return ranksLimiter(req, res, next);
};

router.get('/ranks', getAllRanks);
router.get('/ranks/:hash', getRank);
router.post('/ranks', validateUpdateRequestBody, conditionalRateLimiter, postUpdate);
router.delete('/ranks/:hash', deleteUser);

module.exports = router;