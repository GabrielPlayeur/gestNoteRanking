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

// GET /admin/security/stats - Statistiques de sécurité
router.get('/security/stats', adminAuth, getSecurityStats);

// GET /admin/security/report - Rapport de sécurité complet
router.get('/security/report', adminAuth, getSecurityReport);

// POST /admin/security/block - Bloquer une IP
router.post('/security/block', adminAuth, blockIP);

// DELETE /admin/security/block/:ip - Débloquer une IP
router.delete('/security/block/:ip', adminAuth, unblockIP);

// GET /admin/security/blocked - Liste des IP bloquées
router.get('/security/blocked', adminAuth, getBlockedIPs);

// POST /admin/security/analyze - Forcer une nouvelle analyse des logs
router.post('/security/analyze', adminAuth, analyzeSecurityLogs);

module.exports = router;
