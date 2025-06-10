const { ipBlocker } = require('../utils/ipBlocker');
const SecurityLogAnalyzer = require('../utils/SecurityLogAnalyzer');
const { SecurityLogger } = require('../utils/securityLogger');

/**
 * Middleware d'authentification pour les routes d'administration
 */
const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN || '';
  if (!token || token !== expectedToken) {
    SecurityLogger.logInvalidUserAgent(req); // Réutiliser ce type de log pour les tentatives d'accès admin
    return res.status(401).json({ error: 'Token d\'administration requis' });
  }
  next();
};

/**
 * GET /admin/security/stats - Statistiques de sécurité
 */
const getSecurityStats = async (req, res) => {
  try {
    const analyzer = new SecurityLogAnalyzer();
    const report = await analyzer.analyzeSecurityLogs();
    const ipStats = ipBlocker.getStats();
    res.json({
      timestamp: new Date().toISOString(),
      security: {
        totalEvents: report.summary.totalEvents,
        uniqueIPs: report.summary.uniqueIPs,
        criticalEvents: report.summary.criticalCount,
        suspiciousIPs: report.summary.suspiciousIPCount,
        highRiskIPs: report.summary.highRiskIPCount
      },
      blockedIPs: ipStats,
      recommendations: report.recommendations
    });
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin security stats');
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

/**
 * GET /admin/security/report - Rapport de sécurité complet
 */
const getSecurityReport = async (req, res) => {
  try {
    const analyzer = new SecurityLogAnalyzer();
    const report = await analyzer.analyzeSecurityLogs();
    res.json(report);
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin security report');
    res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
  }
};

/**
 * POST /admin/security/block - Bloquer une IP
 */
const blockIP = (req, res) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) {
      return res.status(400).json({ error: 'IP requise' });
    }
    ipBlocker.blockIP(ip, reason || 'Manual admin block');
    res.json({
      success: true,
      message: `IP ${ip} bloquée`,
      blockedCount: ipBlocker.getStats().blockedCount
    });
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin block IP');
    res.status(500).json({ error: 'Erreur lors du blocage de l\'IP' });
  }
};

/**
 * DELETE /admin/security/block/:ip - Débloquer une IP
 */
const unblockIP = (req, res) => {
  try {
    const { ip } = req.params;
    ipBlocker.unblockIP(ip);
    res.json({
      success: true,
      message: `IP ${ip} débloquée`,
      blockedCount: ipBlocker.getStats().blockedCount
    });
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin unblock IP');
    res.status(500).json({ error: 'Erreur lors du déblocage de l\'IP' });
  }
};

/**
 * GET /admin/security/blocked - Liste des IP bloquées
 */
const getBlockedIPs = (req, res) => {
  try {
    const stats = ipBlocker.getStats();
    res.json(stats);
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin get blocked IPs');
    res.status(500).json({ error: 'Erreur lors de la récupération des IP bloquées' });
  }
};

/**
 * POST /admin/security/analyze - Forcer une nouvelle analyse des logs
 */
const analyzeSecurityLogs = async (req, res) => {
  try {
    const analyzer = new SecurityLogAnalyzer();
    const report = await analyzer.analyzeSecurityLogs();
    const blockList = analyzer.generateBlockList(report);
    // Ajouter automatiquement les IP à haut risque à la liste de blocage
    let newlyBlocked = 0;
    if (req.body.autoBlock && blockList.ips.length > 0) {
      blockList.ips.forEach(ip => {
        if (!ipBlocker.isBlocked(ip)) {
          ipBlocker.blockIP(ip, 'Auto-block from security analysis');
          newlyBlocked++;
        }
      });
    }
    res.json({
      success: true,
      report: {
        suspiciousIPs: report.summary.suspiciousIPCount,
        highRiskIPs: report.summary.highRiskIPCount,
        recommendations: report.recommendations.length
      },
      blockList: {
        recommended: blockList.ips.length,
        newlyBlocked: newlyBlocked
      }
    });
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin security analyze');
    res.status(500).json({ error: 'Erreur lors de l\'analyse de sécurité' });
  }
};

module.exports = {
  adminAuth,
  getSecurityStats,
  getSecurityReport,
  blockIP,
  unblockIP,
  getBlockedIPs,
  analyzeSecurityLogs
};