# Security and Logging System - GestNote Ranking

## Overview

The GestNote Ranking security system monitors and records suspicious behaviors to protect the application against abuse and attacks. It includes:

- **Selective logging**: Records only suspicious events
- **Automatic IP blocking**: Blocks problematic IP addresses
- **Log analysis**: Identifies suspicious patterns
- **Administration API**: Centralized security management

## Types of monitored events

### 🚨 Suspicious events logged:

1. **Zero grade submission** - Potential spam or malicious testing
2. **Rate limit exceeded** - Denial of service attack
3. **Invalid User-Agent** - Unauthorized access attempt
4. **Invalid HMAC signature** - Data falsification attempt
5. **Malformed requests** - Corrupted or malicious data
6. **Suspicious grades** - Aberrant values (negative, >20, very high)
7. **Server errors** - Critical technical issues
8. **CORS violations** - Access attempts from unauthorized domains

### ⚠️ Behaviors NOT logged (normal operation):

- Successful connections
- Normal grade updates
- Legitimate GET requests
- Routine operations

## File structure

```
server/
├── logs/                          # Log files
│   ├── suspicious.log            # Suspicious events
│   ├── critical.log              # Critical events
│   └── ip_blocklist.json         # Blocked IP list
├── utils/
│   ├── securityLogger.js         # Logging module
│   ├── SecurityLogAnalyzer.js    # Log analyzer
│   └── ipBlocker.js              # IP blocking manager
├── routes/
│   └── admin.route.js            # Administration API
└── tools/
    ├── analyze_security_logs.js  # Analysis script
    └── test_security_logging.js  # Logging Tests
```

## Usage

### 1. Analyze security logs

```bash
cd server
node tools/analyze_security_logs.js
```

**Example output:**
```
=== ANALYSE DES LOGS DE security ===

Résumé de l'analyse:
- events suspects totaux: 45
- IP uniques détectées: 8
- events criticals: 3
- IP suspectes (≥5 events): 2
- IP à haut risque: 1

🚨 HIGH RISK IPs:
1. IP: 192.168.1.100
   - Events: 15
   - Severity: critical
   - Event types: zero_grade_submission(8), rate_limit_exceeded(4), invalid_hmac_signature(3)
```

### 2. Test the logging system

```bash
cd server
node tools/test_security_logging.js
```

### 3. Administration API

#### Authentication
All admin routes require the `X-Admin-token` header with the value defined in `ADMIN_token`.

#### Available endpoints:

**GET /admin/security/stats**
```json
{
  "security": {
    "totalEvents": 45,
    "uniqueIPs": 8,
    "criticalEvents": 3,
    "suspiciousIPs": 2,
    "highRiskIPs": 1
  },
  "blockedIPs": {
    "blockedCount": 3,
    "lastUpdate": "2025-06-10T20:15:30.000Z"
  }
}
```

**GET /admin/security/report**
- Rapport complet avec détails des IP suspectes

**POST /admin/security/block**
```json
{
  "ip": "192.168.1.100",
  "reason": "Activité suspecte répétée"
}
```

**DELETE /admin/security/block/192.168.1.100**
- DéBlock an IP

**GET /admin/security/blocked**
- Liste des IP actuellement bloquées

**POST /admin/security/analyze**
```json
{
  "autoBlock": true  // Block automatiquement les IP à haut risque
}
```

### 4. Configuration

#### Environment variables (.env)
```
ADMIN_token=YOUR_token
```

#### Seuils configurables

Dans `SecurityLogAnalyzer.js` :
- `suspiciousThreshold: 5` - Nombre d'events pour considérer une IP comme suspecte
- `updateInterval: 5 * 60 * 1000` - Fréquence de mise à jour des listes de blocage (5 min)

## Usage examples

### Monitor les attaques en temps réel

```bash
# Monitor les logs en continu
tail -f server/logs/suspicious.log | grep "rate_limit_exceeded"

# Analyze les logs toutes les heures
*/60 * * * * cd /path/to/server && node tools/analyze_security_logs.js
```

### Block manuellement une IP

```bash
curl -X POST http://localhost:5000/admin/security/block \
  -H "X-Admin-token: YOUR_token" \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.1.100", "reason": "Attaque détectée"}'
```

### Obtenir des statistiques

```bash
curl -H "X-Admin-token: YOUR_token" \
  http://localhost:5000/admin/security/stats
```

## Fonctionnalités automatiques

### Blocage automatique
- Les IP avec plus de 10 events suspects sont automatiquement ajoutées à la liste de Monitoring
- Les IP avec des events criticals répétés peuvent être bloquées automatiquement

### Rotation des logs
- files de logs limités à 5MB chacun
- Conservation de 5 files de backup
- Nettoyage automatique des anciens logs

### Alertes recommendedes
- IP à haut risque : blocage immédiat recommended
- IP suspectes : Monitoring renforcée
- events criticals : investigation manuelle requirede

## Intégration avec des systèmes externes

### Firewall/Proxy
Le file `ip_blocklist.json` peut être utilisé par :
- Nginx
- Apache
- Cloudflare
- Pare-feu réseau

### Monitoring
Les logs sont compatibles avec :
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Grafana + Loki
- Systèmes SIEM

## security et conformité

- Les logs contiennent uniquement les informations nécessaires (pas de données personnelles)
- Les IP sont anonymisables si required par RGPD
- Audit trail complet des actions administratives
- Chiffrement recommended pour les files de logs en production
