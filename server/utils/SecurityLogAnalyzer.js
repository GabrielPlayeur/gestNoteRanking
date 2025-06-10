const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Security log analyzer to identify suspicious IPs
 */
class SecurityLogAnalyzer {
  constructor() {
    this.suspiciousLogPath = path.join(__dirname, '../logs/suspicious.log');
    this.criticalLogPath = path.join(__dirname, '../logs/critical.log');
  }
  /**
   * Analyzes logs and generates a report of suspicious IPs
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
        suspiciousThreshold: 5 // Number of suspicious events to consider an IP as problematic
      }
    };

    try {
      // Analyze suspicious logs
      if (fs.existsSync(this.suspiciousLogPath)) {
        await this.processLogFile(this.suspiciousLogPath, report, 'suspicious');
      }

      // Analyze critical logs
      if (fs.existsSync(this.criticalLogPath)) {
        await this.processLogFile(this.criticalLogPath, report, 'critical');
      }

      // Calculate final statistics
      report.summary.uniqueIPs = report.suspiciousIPs.size;
      report.summary.totalEvents = Array.from(report.suspiciousIPs.values())
        .reduce((total, ip) => total + ip.eventCount, 0);

      return this.generateReport(report);
    } catch (error) {
      console.error('Error during log analysis:', error);
      throw error;
    }
  }
  /**
   * Processes a log file line by line
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
          console.warn('Invalid log line:', line);
        }
      }
    }
  }
  /**
   * Processes an individual log entry
   */
  processLogEntry(logEntry, report, severity) {
    const ip = logEntry.ip || 'unknown';
    const eventType = logEntry.type || 'unknown';
    const timestamp = logEntry.timestamp || new Date().toISOString();

    // Initialize or update IP data
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

    // Count event types
    if (!ipData.eventTypes.has(eventType)) {
      ipData.eventTypes.set(eventType, 0);
    }
    ipData.eventTypes.set(eventType, ipData.eventTypes.get(eventType) + 1);

    // Collect User-Agents
    if (logEntry.userAgent && logEntry.userAgent !== 'unknown') {
      ipData.userAgents.add(logEntry.userAgent);
    }

    // Update severity
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
   * Generates the final report
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
      criticalEvents: report.criticalEvents.slice(-20), // Last 20 critical events
      recommendations: this.generateRecommendations(suspiciousIPs, highRiskIPs)
    };
  }
  /**
   * Generates recommendations based on analysis
   */
  generateRecommendations(suspiciousIPs, highRiskIPs) {
    const recommendations = [];

    if (highRiskIPs.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'block_ips',
        description: `Immediately block the ${highRiskIPs.length} high-risk IP(s)`,
        ips: highRiskIPs.slice(0, 10).map(ip => ip.ip)
      });
    }

    if (suspiciousIPs.length > 10) {
      recommendations.push({
        priority: 'medium',
        action: 'monitor_ips',
        description: `Closely monitor ${suspiciousIPs.length} suspicious IP(s)`,
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
        description: 'Investigate zero grade submission attacks',
        ips: zeroGradeAttacks.map(ip => ip.ip)
      });
    }

    return recommendations;
  }
  /**
   * Generates a list of IPs to block for a firewall
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
