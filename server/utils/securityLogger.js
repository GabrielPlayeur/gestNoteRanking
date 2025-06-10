const winston = require('winston');
const path = require('path');

// Configuration for suspicious behavior logger
const suspiciousLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gestnote-security' },
  transports: process.env.NODE_ENV === 'test' ? [
    // In test mode, only log to console to avoid conflicts
    new winston.transports.Console({
      silent: true // Silent during tests
    })
  ] : [
    // File for all suspicious logs
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/suspicious.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,      tailable: true
    }),
    // Separate file for critical errors
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/critical.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// In development, also display in console (except in test)
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  suspiciousLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Utility function to get real client IP
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         'unknown';
}

// Utility function to get User-Agent
function getUserAgent(req) {
  return req.headers['user-agent'] || 
         req.headers['x-extension-user-agent'] || 
         'unknown';
}

// Types of suspicious behaviors
const SuspiciousActivityType = {
  ZERO_GRADE_SUBMISSION: 'zero_grade_submission',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_USER_AGENT: 'invalid_user_agent',
  INVALID_HMAC_SIGNATURE: 'invalid_hmac_signature',
  MALFORMED_REQUEST: 'malformed_request',
  SUSPICIOUS_GRADE: 'suspicious_grade',
  REPEATED_FAILURES: 'repeated_failures',
  SERVER_ERROR: 'server_error',
  CORS_VIOLATION: 'cors_violation',
  MISSING_HMAC: 'missing_hmac'
};

// Specialized logging functions
const SecurityLogger = {
  // Log for zero grade submission
  logZeroGradeSubmission: (req, grade, userData) => {
    suspiciousLogger.warn('Zero grade submission detected', {
      type: SuspiciousActivityType.ZERO_GRADE_SUBMISSION,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      grade: grade,
      userData: {
        hash: userData.hash || 'unknown',
        year: userData.year,
        departement: userData.departement,
        maquette: userData.maquette
      },
      timestamp: new Date().toISOString(),
      severity: 'medium'
    });
  },

  // Log for rate limit exceeded
  logRateLimitExceeded: (req, limit, windowMs) => {
    suspiciousLogger.warn('Rate limit exceeded', {
      type: SuspiciousActivityType.RATE_LIMIT_EXCEEDED,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      limit: limit,
      windowMs: windowMs,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      severity: 'high'
    });
  },

  // Log for invalid User-Agent
  logInvalidUserAgent: (req) => {
    suspiciousLogger.warn('Invalid User-Agent detected', {
      type: SuspiciousActivityType.INVALID_USER_AGENT,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      expectedPattern: 'GestNote Extension*',
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      severity: 'medium'
    });
  },

  // Log for invalid HMAC signature
  logInvalidHMACSignature: (req, providedSignature) => {
    suspiciousLogger.warn('Invalid HMAC signature', {
      type: SuspiciousActivityType.INVALID_HMAC_SIGNATURE,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      providedSignature: providedSignature ? 'provided' : 'missing',
      url: req.originalUrl,
      method: req.method,
      body: req.body ? Object.keys(req.body) : 'empty',
      timestamp: new Date().toISOString(),
      severity: 'high'
    });
  },

  // Log for malformed request
  logMalformedRequest: (req, validationErrors) => {
    suspiciousLogger.warn('Malformed request received', {
      type: SuspiciousActivityType.MALFORMED_REQUEST,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      url: req.originalUrl,
      method: req.method,
      validationErrors: validationErrors,
      body: req.body,
      timestamp: new Date().toISOString(),
      severity: 'medium'
    });
  },

  // Log for suspicious grade (too high or negative)
  logSuspiciousGrade: (req, grade, userData) => {
    suspiciousLogger.warn('Suspicious grade value', {
      type: SuspiciousActivityType.SUSPICIOUS_GRADE,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      grade: grade,
      userData: {
        hash: userData.hash || 'unknown',
        year: userData.year,
        departement: userData.departement,
        maquette: userData.maquette
      },
      timestamp: new Date().toISOString(),
      severity: 'medium'
    });
  },

  // Log for server errors
  logServerError: (req, error, context) => {
    suspiciousLogger.error('Server error occurred', {
      type: SuspiciousActivityType.SERVER_ERROR,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      url: req.originalUrl,
      method: req.method,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: context,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    });
  },

  // Log for CORS violation
  logCORSViolation: (req, origin) => {
    suspiciousLogger.warn('CORS violation detected', {
      type: SuspiciousActivityType.CORS_VIOLATION,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      origin: origin,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      severity: 'medium'
    });
  },

  // Log for missing HMAC
  logMissingHMAC: (req) => {
    suspiciousLogger.warn('Missing HMAC signature', {
      type: SuspiciousActivityType.MISSING_HMAC,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      url: req.originalUrl,
      method: req.method,
      headers: Object.keys(req.headers),
      timestamp: new Date().toISOString(),
      severity: 'high'
    });
  }
};

module.exports = {
  SecurityLogger,
  SuspiciousActivityType,
  getClientIP,
  getUserAgent
};
