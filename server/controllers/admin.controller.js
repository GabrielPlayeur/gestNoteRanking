const { ipBlocker } = require('../utils/ipBlocker');
const SecurityLogAnalyzer = require('../utils/SecurityLogAnalyzer');
const { SecurityLogger } = require('../utils/securityLogger');

/**
 * Authentication middleware for admin routes
 */
const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN || '';
  if (!token || token !== expectedToken) {
    SecurityLogger.logInvalidUserAgent(req);
    return res.status(401).json({ error: 'Administration token required' });
  }
  next();
};

/**
 * GET /admin/security/stats - Security statistics
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
      recommendations: report.recommendations    });
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin security stats');
    res.status(500).json({ error: 'Error retrieving statistics' });
  }
};

/**
 * GET /admin/security/report - Complete security report
 */
const getSecurityReport = async (req, res) => {
  try {
    const analyzer = new SecurityLogAnalyzer();
    const report = await analyzer.analyzeSecurityLogs();
    res.json(report);
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin security report');
    res.status(500).json({ error: 'Error generating report' });
  }
};

/**
 * POST /admin/security/block - Block an IP
 */
const blockIP = (req, res) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) {
      return res.status(400).json({ error: 'IP required' });
    }
    ipBlocker.blockIP(ip, reason || 'Manual admin block');    res.json({
      success: true,
      message: `IP ${ip} blocked`,
      blockedCount: ipBlocker.getStats().blockedCount
    });
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin block IP');
    res.status(500).json({ error: 'Error blocking IP' });
  }
};

/**
 * DELETE /admin/security/block/:ip - Unblock an IP
 */
const unblockIP = (req, res) => {
  try {
    const { ip } = req.params;
    ipBlocker.unblockIP(ip);
    res.json({
      success: true,
      message: `IP ${ip} unblocked`,
      blockedCount: ipBlocker.getStats().blockedCount
    });
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin unblock IP');
    res.status(500).json({ error: 'Error unblocking IP' });
  }
};

/**
 * GET /admin/security/blocked - List of blocked IPs
 */
const getBlockedIPs = (req, res) => {
  try {
    const stats = ipBlocker.getStats();
    res.json(stats);
  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin get blocked IPs');
    res.status(500).json({ error: 'Error retrieving blocked IPs' });
  }
};

/**
 * POST /admin/security/analyze - Force new log analysis
 */
const analyzeSecurityLogs = async (req, res) => {
  try {
    const analyzer = new SecurityLogAnalyzer();
    const report = await analyzer.analyzeSecurityLogs();
    const blockList = analyzer.generateBlockList(report);
    // Automatically add high-risk IPs to block list
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
    });  } catch (error) {
    SecurityLogger.logServerError(req, error, 'admin security analyze');
    res.status(500).json({ error: 'Error during security analysis' });
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