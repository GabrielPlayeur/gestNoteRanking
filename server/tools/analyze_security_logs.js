const SecurityLogAnalyzer = require('../utils/SecurityLogAnalyzer');

async function runSecurityAnalysis() {
    try {
        console.log('=== ANALYSE DES LOGS DE SÉCURITÉ ===\n');

        const analyzer = new SecurityLogAnalyzer();
        const report = await analyzer.analyzeSecurityLogs();

        console.log('Résumé de l\'analyse:');
        console.log(`- Événements suspects totaux: ${report.summary.totalEvents}`);
        console.log(`- IP uniques détectées: ${report.summary.uniqueIPs}`);
        console.log(`- Événements critiques: ${report.summary.criticalCount}`);
        console.log(`- IP suspectes (≥5 événements): ${report.summary.suspiciousIPCount}`);
        console.log(`- IP à haut risque: ${report.summary.highRiskIPCount}\n`);

        if (report.highRiskIPs.length > 0) {
            console.log('🚨 IP À HAUT RISQUE:');
            report.highRiskIPs.forEach((ip, index) => {
                console.log(`${index + 1}. IP: ${ip.ip}`);
                console.log(`   - Événements: ${ip.eventCount}`);
                console.log(`   - Sévérité: ${ip.severity}`);
                console.log(`   - Types d'événements: ${Object.entries(ip.eventTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`);
                console.log(`   - Première activité: ${ip.firstSeen}`);
                console.log(`   - Dernière activité: ${ip.lastSeen}`);
                if (ip.userAgents.length > 0) {
                    console.log(`   - User-Agents: ${ip.userAgents.slice(0, 2).join(', ')}${ip.userAgents.length > 2 ? '...' : ''}`);
                }
                console.log('');
            });
        }

        if (report.suspiciousIPs.length > 0) {
            console.log('⚠️  IP SUSPECTES:');
            report.suspiciousIPs.slice(0, 10).forEach((ip, index) => {
                console.log(`${index + 1}. IP: ${ip.ip} - ${ip.eventCount} événements - Sévérité: ${ip.severity}`);
                console.log(`   Types: ${Object.entries(ip.eventTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`);
            });
            if (report.suspiciousIPs.length > 10) {
                console.log(`   ... et ${report.suspiciousIPs.length - 10} autres IP suspectes\n`);
            }
        }

        if (report.criticalEvents.length > 0) {
            console.log('🔥 ÉVÉNEMENTS CRITIQUES RÉCENTS:');
            report.criticalEvents.slice(-5).forEach((event, index) => {
                console.log(`${index + 1}. ${event.timestamp} - IP: ${event.ip}`);
                console.log(`   Type: ${event.type}`);
                console.log(`   Détails: ${event.details.error?.message || 'N/A'}`);
                console.log('');
            });
        }

        if (report.recommendations.length > 0) {
            console.log('💡 RECOMMANDATIONS:');
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
                if (rec.ips && rec.ips.length > 0) {
                    console.log(`   IP concernées: ${rec.ips.slice(0, 5).join(', ')}${rec.ips.length > 5 ? '...' : ''}`);
                }
                console.log('');
            });
        }

        // Générer une liste de blocage si nécessaire
        const blockList = analyzer.generateBlockList(report);
        if (blockList.ips.length > 0) {
            console.log('🚫 LISTE DE BLOCAGE RECOMMANDÉE:');
            console.log(`${blockList.count} IP(s) à bloquer:`);
            blockList.ips.forEach(ip => console.log(`- ${ip}`));
            console.log('');

            // Sauvegarder la liste de blocage
            // const fs = require('fs');
            // const path = require('path');
            // const blockListPath = path.join(__dirname, '../logs/ip_blocklist.json');
            // fs.writeFileSync(blockListPath, JSON.stringify(blockList, null, 2));
            // console.log(`Liste de blocage sauvegardée dans: ${blockListPath}`);
        }

    } catch (error) {
        console.error('Erreur lors de l\'analyse:', error);
    }
}

// Exécuter l'analyse
runSecurityAnalysis();
