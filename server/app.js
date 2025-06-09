const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require("helmet");
const rateLimit = require('express-rate-limit');
const manifest = require('../extension/manifest.json');

const ranksRouter = require('./routes/ranks.route');
const privacyPolicyRouter = require('./routes/privacyPolicy.route');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(
    helmet.contentSecurityPolicy({
      directives: {
        "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
      },
    }),
);

const EXTENSION_VERSION = manifest.version;
const EXTENSION_USER_AGENT = `GestNoteRanking/${EXTENSION_VERSION}`;


app.get("/", function (req, res) {
    res.send("Hello World!");
});

// CORS restrictif : n'autorise que les requêtes venant de l'extension ou du site officiel
const allowedOrigins = [
  'https://scolarite.polytech.univ-nantes.fr',
  'chrome-extension://', // Pour Chrome extension
  'moz-extension://',    // Pour Firefox extension
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));

function userAgentMiddleware(req, res, next) {
  const userAgent = req.get('User-Agent') || '';
  const extensionUserAgent = req.get('X-Extension-User-Agent') || '';
  // Vérifie soit le User-Agent standard, soit le header personnalisé de l'extension
  if (!userAgent.includes(EXTENSION_USER_AGENT) && !extensionUserAgent.includes(EXTENSION_USER_AGENT)) {
    return res.status(403).json({ error: 'User-Agent non autorisé' });
  }
  next();
}

app.use('/api/ranks', userAgentMiddleware);
app.use('/api', ranksRouter);
app.use('/privacy-policy', privacyPolicyRouter);

module.exports = app;
module.exports.userAgentMiddleware = userAgentMiddleware;