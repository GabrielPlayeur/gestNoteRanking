const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Analyseur de logs de sécurité pour identifier les IP suspectes
 */
class SecurityLogAnalyzer {
  constructor() {
    this.suspiciousLogPath = path.join(__dirname, '../logs/suspicious.log');
    this.criticalLogPath = path.join(__dirname, '../logs/critical.log');
  }

  /**
   * Analyse les logs et génère un rapport des IP suspectes
   */
  async analyzeSecurityLogs() {
    const report = {
      timestamp: new Date().toISOString(),
      suspiciousIPs: new Map(),
      criticalEvents: [],
      summary: {
        totalEvents: 0,
        uniqueIPs: 0,
        criticalCount: 0,
        suspiciousThreshold: 5 // Nombre d'événements suspects pour considérer une IP comme problématique
      }
    };

    try {
      // Analyser les logs suspects
      if (fs.existsSync(this.suspiciousLogPath)) {
        await this.processLogFile(this.suspiciousLogPath, report, 'suspicious');
      }

      // Analyser les logs critiques
      if (fs.existsSync(this.criticalLogPath)) {
        await this.processLogFile(this.criticalLogPath, report, 'critical');
      }

      // Calculer les statistiques finales
      report.summary.uniqueIPs = report.suspiciousIPs.size;
      report.summary.totalEvents = Array.from(report.suspiciousIPs.values())
        .reduce((total, ip) => total + ip.eventCount, 0);

      return this.generateReport(report);
    } catch (error) {
      console.error('Erreur lors de l\'analyse des logs:', error);
      throw error;
    }
  }

  /**
   * Traite un fichier de log ligne par ligne
   */
  async processLogFile(filePath, report, severity) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const logEntry = JSON.parse(line);
          this.processLogEntry(logEntry, report, severity);
        } catch (parseError) {
          console.warn('Ligne de log invalide:', line);
        }
      }
    }
  }

  /**
   * Traite une entrée de log individuelle
   */
  processLogEntry(logEntry, report, severity) {
    const ip = logEntry.ip || 'unknown';
    const eventType = logEntry.type || 'unknown';
    const timestamp = logEntry.timestamp || new Date().toISOString();

    // Initialiser ou mettre à jour les données de l'IP
    if (!report.suspiciousIPs.has(ip)) {
      report.suspiciousIPs.set(ip, {
        ip: ip,
        eventCount: 0,
        eventTypes: new Map(),
        firstSeen: timestamp,
        lastSeen: timestamp,
        userAgents: new Set(),
        severity: 'low'
      });
    }

    const ipData = report.suspiciousIPs.get(ip);
    ipData.eventCount++;
    ipData.lastSeen = timestamp;

    // Compter les types d'événements
    if (!ipData.eventTypes.has(eventType)) {
      ipData.eventTypes.set(eventType, 0);
    }
    ipData.eventTypes.set(eventType, ipData.eventTypes.get(eventType) + 1);

    // Collecter les User-Agents
    if (logEntry.userAgent && logEntry.userAgent !== 'unknown') {
      ipData.userAgents.add(logEntry.userAgent);
    }

    // Mettre à jour la sévérité
    if (severity === 'critical' || logEntry.severity === 'critical') {
      ipData.severity = 'critical';
      report.criticalEvents.push({
        ip: ip,
        type: eventType,
        timestamp: timestamp,
        details: logEntry
      });
      report.summary.criticalCount++;
    } else if (ipData.severity !== 'critical' && (severity === 'high' || logEntry.severity === 'high')) {
      ipData.severity = 'high';
    } else if (ipData.severity === 'low' && logEntry.severity === 'medium') {
      ipData.severity = 'medium';
    }
  }

  /**
   * Génère le rapport final
   */
  generateReport(report) {
    const suspiciousIPs = Array.from(report.suspiciousIPs.values())
      .filter(ip => ip.eventCount >= report.summary.suspiciousThreshold)
      .sort((a, b) => b.eventCount - a.eventCount);

    const highRiskIPs = Array.from(report.suspiciousIPs.values())
      .filter(ip => ip.severity === 'critical' || ip.eventCount >= 10)
      .sort((a, b) => b.eventCount - a.eventCount);

    return {
      timestamp: report.timestamp,
      summary: {
        ...report.summary,
        suspiciousIPCount: suspiciousIPs.length,
        highRiskIPCount: highRiskIPs.length
      },
      suspiciousIPs: suspiciousIPs.map(ip => ({
        ...ip,
        eventTypes: Object.fromEntries(ip.eventTypes),
        userAgents: Array.from(ip.userAgents)
      })),
      highRiskIPs: highRiskIPs.map(ip => ({
        ...ip,
        eventTypes: Object.fromEntries(ip.eventTypes),
        userAgents: Array.from(ip.userAgents)
      })),
      criticalEvents: report.criticalEvents.slice(-20), // Derniers 20 événements critiques
      recommendations: this.generateRecommendations(suspiciousIPs, highRiskIPs)
    };
  }

  /**
   * Génère des recommandations basées sur l'analyse
   */
  generateRecommendations(suspiciousIPs, highRiskIPs) {
    const recommendations = [];

    if (highRiskIPs.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'block_ips',
        description: `Bloquer immédiatement les ${highRiskIPs.length} IP(s) à haut risque`,
        ips: highRiskIPs.slice(0, 10).map(ip => ip.ip)
      });
    }

    if (suspiciousIPs.length > 10) {
      recommendations.push({
        priority: 'medium',
        action: 'monitor_ips',
        description: `Surveiller étroitement ${suspiciousIPs.length} IP(s) suspectes`,
        ips: suspiciousIPs.slice(0, 20).map(ip => ip.ip)
      });
    }

    const zeroGradeAttacks = suspiciousIPs.filter(ip => 
      ip.eventTypes['zero_grade_submission'] && ip.eventTypes['zero_grade_submission'] > 3
    );

    if (zeroGradeAttacks.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'investigate_zero_grades',
        description: 'Enquêter sur les attaques de soumission de notes zéro',
        ips: zeroGradeAttacks.map(ip => ip.ip)
      });
    }

    return recommendations;
  }

  /**
   * Génère une liste d'IP à bloquer pour un firewall
   */
  generateBlockList(report) {
    const highRiskIPs = report.highRiskIPs || [];
    const blockList = highRiskIPs
      .filter(ip => ip.ip !== 'unknown' && ip.ip !== 'localhost' && ip.ip !== '127.0.0.1')
      .map(ip => ip.ip);

    return {
      timestamp: new Date().toISOString(),
      reason: 'Suspicious activity detected',
      ips: blockList,
      count: blockList.length
    };
  }
}

module.exports = SecurityLogAnalyzer;
