const express = require('express');
const router = express.Router();
const {
  adminAuth,
  getSecurityStats,
  getSecurityReport,
  blockIP,
  unblockIP,
  getBlockedIPs,
  analyzeSecurityLogs
} = require('../controllers/admin.controller');

// GET /admin/security/stats - Security statistics
router.get('/security/stats', adminAuth, getSecurityStats);

// GET /admin/security/report - Complete security report
router.get('/security/report', adminAuth, getSecurityReport);

// POST /admin/security/block - Block an IP
router.post('/security/block', adminAuth, blockIP);

// DELETE /admin/security/block/:ip - Unblock an IP
router.delete('/security/block/:ip', adminAuth, unblockIP);

// GET /admin/security/blocked - List of blocked IPs
router.get('/security/blocked', adminAuth, getBlockedIPs);

// POST /admin/security/analyze - Force new log analysis
router.post('/security/analyze', adminAuth, analyzeSecurityLogs);

module.exports = router;
