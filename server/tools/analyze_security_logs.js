const SecurityLogAnalyzer = require('../utils/SecurityLogAnalyzer');

async function runSecurityAnalysis() {
    try {
        console.log('=== SECURITY LOGS ANALYSIS ===\n');

        const analyzer = new SecurityLogAnalyzer();
        const report = await analyzer.analyzeSecurityLogs();

        console.log('Analysis summary:');
        console.log(`- Total suspicious events: ${report.summary.totalEvents}`);
        console.log(`- Unique IPs detected: ${report.summary.uniqueIPs}`);
        console.log(`- Critical events: ${report.summary.criticalCount}`);
        console.log(`- Suspicious IPs (≥5 events): ${report.summary.suspiciousIPCount}`);
        console.log(`- High-risk IPs: ${report.summary.highRiskIPCount}\n`);
        if (report.highRiskIPs.length > 0) {
            console.log('🚨 HIGH-RISK IPs:');
            report.highRiskIPs.forEach((ip, index) => {
                console.log(`${index + 1}. IP: ${ip.ip}`);
                console.log(`   - Events: ${ip.eventCount}`);
                console.log(`   - Severity: ${ip.severity}`);
                console.log(`   - Event types: ${Object.entries(ip.eventTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`);
                console.log(`   - First activity: ${ip.firstSeen}`);
                console.log(`   - Last activity: ${ip.lastSeen}`);
                if (ip.userAgents.length > 0) {
                    console.log(`   - User-Agents: ${ip.userAgents.slice(0, 2).join(', ')}${ip.userAgents.length > 2 ? '...' : ''}`);
                }
                console.log('');
            });
        }
        if (report.suspiciousIPs.length > 0) {
            console.log('⚠️  SUSPICIOUS IPs:');
            report.suspiciousIPs.slice(0, 10).forEach((ip, index) => {
                console.log(`${index + 1}. IP: ${ip.ip} - ${ip.eventCount} events - Severity: ${ip.severity}`);
                console.log(`   Types: ${Object.entries(ip.eventTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`);
            });
            if (report.suspiciousIPs.length > 10) {
                console.log(`   ... and ${report.suspiciousIPs.length - 10} other suspicious IPs\n`);
            }
        }

        if (report.criticalEvents.length > 0) {
            console.log('🔥 RECENT CRITICAL EVENTS:');
            report.criticalEvents.slice(-5).forEach((event, index) => {
                console.log(`${index + 1}. ${event.timestamp} - IP: ${event.ip}`);
                console.log(`   Type: ${event.type}`);
                console.log(`   Details: ${event.details.error?.message || 'N/A'}`);
                console.log('');
            });
        }

        if (report.recommendations.length > 0) {
            console.log('💡 RECOMMENDATIONS:');
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
                if (rec.ips && rec.ips.length > 0) {
                    console.log(`   Affected IPs: ${rec.ips.slice(0, 5).join(', ')}${rec.ips.length > 5 ? '...' : ''}`);
                }
                console.log('');
            });
        }
        // Generate a block list if necessary
        const blockList = analyzer.generateBlockList(report);
        if (blockList.ips.length > 0) {
            console.log('🚫 RECOMMENDED BLOCK LIST:');
            console.log(`${blockList.count} IP(s) to block:`);
            blockList.ips.forEach(ip => console.log(`- ${ip}`));
            console.log('');
            // Save the block list
            // const fs = require('fs');
            // const path = require('path');
            // const blockListPath = path.join(__dirname, '../logs/ip_blocklist.json');
            // fs.writeFileSync(blockListPath, JSON.stringify(blockList, null, 2));
            // console.log(`Block list saved to: ${blockListPath}`);
        }    } catch (error) {
        console.error('Error during analysis:', error);
    }
}

// Execute the analysis
runSecurityAnalysis();
