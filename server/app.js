const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require("helmet");
const rateLimit = require('express-rate-limit');
const manifest = require('../extension/manifest.json');
const { SecurityLogger } = require('./utils/securityLogger');
const { ipBlocker } = require('./utils/ipBlocker');

const ranksRouter = require('./routes/ranks.route');
const privacyPolicyRouter = require('./routes/privacyPolicy.route');
const adminRouter = require('./routes/admin.route');

const app= express();

app.use(ipBlocker.middleware());
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

// Restrictive CORS: only allow requests from extension or official site
const allowedOrigins = [
  'https://scolarite.polytech.univ-nantes.fr',
  'chrome-extension://', // For Chrome extension
  'moz-extension://',    // For Firefox extension
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    const req = { headers: { origin }, ip: 'unknown' };
    SecurityLogger.logCORSViolation(req, origin);
    return callback(new Error('Not allowed by CORS'));
  }
}));

function userAgentMiddleware(req, res, next) {
  const userAgent = req.get('User-Agent') || '';
  const extensionUserAgent = req.get('X-Extension-User-Agent') || '';
  if (!userAgent.includes(EXTENSION_USER_AGENT) && !extensionUserAgent.includes(EXTENSION_USER_AGENT)) {
    SecurityLogger.logInvalidUserAgent(req);
    return res.status(403).json({ error: 'Unauthorized User-Agent' });
  }
  next();
}

app.use('/api/ranks', userAgentMiddleware);
app.use('/api', ranksRouter);
app.use('/privacy-policy', privacyPolicyRouter);
app.use('/admin', adminRouter);

module.exports = app;
module.exports.userAgentMiddleware = userAgentMiddleware;