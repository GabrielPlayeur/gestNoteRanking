const fs = require('fs');
const path = require('path');
const { SecurityLogger, getClientIP } = require('./securityLogger');

/**
 * Middleware de blocage d'IP basé sur la liste de blocage générée par l'analyse des logs
 */
class IPBlocker {
  constructor() {
    this.blockListPath = path.join(__dirname, '../logs/ip_blocklist.json');
    this.blockedIPs = new Set();
    this.lastUpdate = 0;
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
    this.isTestMode = process.env.NODE_ENV === 'test';

    // Charger la liste initiale sauf en mode test
    if (!this.isTestMode) {
      this.updateBlockList();
    }
  }

  /**
   * Met à jour la liste des IP bloquées depuis le fichier
   */
  updateBlockList() {
    try {
      if (fs.existsSync(this.blockListPath)) {
        const stats = fs.statSync(this.blockListPath);
        const fileTime = stats.mtime.getTime();
        // Ne recharger que si le fichier a été modifié
        if (fileTime > this.lastUpdate) {
          const blockListData = JSON.parse(fs.readFileSync(this.blockListPath, 'utf8'));
          this.blockedIPs = new Set(blockListData.ips || []);
          this.lastUpdate = fileTime;
          console.log(`Liste de blocage mise à jour: ${this.blockedIPs.size} IP(s) bloquées`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la liste de blocage:', error);
    }
  }

  /**
   * Ajoute une IP à la liste de blocage
   */
  blockIP(ip, reason = 'Manual block') {
    this.blockedIPs.add(ip);
    this.saveBlockList(reason);
  }

  /**
   * Retire une IP de la liste de blocage
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.saveBlockList('Manual unblock');
  }

  /**
   * Sauvegarde la liste de blocage actuelle
   */
  saveBlockList(reason = 'Updated block list') {
    try {
      const blockListData = {
        timestamp: new Date().toISOString(),
        reason: reason,
        ips: Array.from(this.blockedIPs),
        count: this.blockedIPs.size
      };

      fs.writeFileSync(this.blockListPath, JSON.stringify(blockListData, null, 2));
      this.lastUpdate = Date.now();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la liste de blocage:', error);
    }
  }
  /**
   * Vérifie si une IP est bloquée
   */
  isBlocked(ip) {
    // En mode test, ne pas bloquer
    if (this.isTestMode) {
      return false;
    }
    // Mettre à jour la liste périodiquement
    if (Date.now() - this.lastUpdate > this.updateInterval) {
      this.updateBlockList();
    }
    return this.blockedIPs.has(ip);
  }

  /**
   * Middleware Express pour bloquer les IP
   */
  middleware() {
    return (req, res, next) => {
      const clientIP = getClientIP(req);
      if (this.isBlocked(clientIP)) {
        // Logger la tentative d'accès d'une IP bloquée
        SecurityLogger.logRateLimitExceeded(req, 0, 0); // Réutiliser ce type de log
        return res.status(403).json({ 
          error: 'Accès interdit',
          message: 'Votre adresse IP a été bloquée en raison d\'activité suspecte.'
        });
      }
      next();
    };
  }

  /**
   * Statistiques sur les IP bloquées
   */
  getStats() {
    return {
      blockedCount: this.blockedIPs.size,
      lastUpdate: new Date(this.lastUpdate).toISOString(),
      blockedIPs: Array.from(this.blockedIPs)
    };
  }
}

// Instance singleton
const ipBlocker = new IPBlocker();

module.exports = {
  IPBlocker,
  ipBlocker
};
