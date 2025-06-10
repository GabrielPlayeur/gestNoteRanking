# Système de Sécurité et de Logging - GestNote Ranking

## Vue d'ensemble

Le système de sécurité de GestNote Ranking surveille et enregistre les comportements suspects pour protéger l'application contre les abus et les attaques. Il comprend :

- **Logging sélectif** : Enregistre uniquement les événements suspects
- **Blocage automatique d'IP** : Bloque les adresses IP problématiques
- **Analyse des logs** : Identifie les patterns suspects
- **API d'administration** : Gestion centralisée de la sécurité

## Types d'événements surveillés

### 🚨 Événements suspects loggés :

1. **Soumission de note 0** - Potentiel spam ou test malveillant
2. **Dépassement de limite de requêtes** - Attaque par déni de service
3. **User-Agent invalide** - Tentative d'accès non autorisé
4. **Signature HMAC invalide** - Tentative de falsification de données
5. **Requêtes malformées** - Données corrompues ou malveillantes
6. **Notes suspectes** - Valeurs aberrantes (négatives, >20, très élevées)
7. **Erreurs serveur** - Problèmes techniques critiques
8. **Violations CORS** - Tentatives d'accès depuis des domaines non autorisés

### ⚠️ Comportements NON loggés (fonctionnement normal) :

- Connexions réussies
- Mises à jour de notes normales
- Requêtes GET légitimes
- Opérations de routine

## Structure des fichiers

```
server/
├── logs/                          # Fichiers de logs
│   ├── suspicious.log            # Événements suspects
│   ├── critical.log              # Événements critiques
│   └── ip_blocklist.json         # Liste des IP bloquées
├── utils/
│   ├── securityLogger.js         # Module de logging
│   ├── SecurityLogAnalyzer.js    # Analyseur de logs
│   └── ipBlocker.js              # Gestionnaire de blocage IP
├── routes/
│   └── admin.route.js            # API d'administration
└── tools/
    ├── analyze_security_logs.js  # Script d'analyse
    └── test_security_logging.js  # Tests de logging
```

## Utilisation

### 1. Analyser les logs de sécurité

```bash
cd server
node tools/analyze_security_logs.js
```

**Sortie exemple :**
```
=== ANALYSE DES LOGS DE SÉCURITÉ ===

Résumé de l'analyse:
- Événements suspects totaux: 45
- IP uniques détectées: 8
- Événements critiques: 3
- IP suspectes (≥5 événements): 2
- IP à haut risque: 1

🚨 IP À HAUT RISQUE:
1. IP: 192.168.1.100
   - Événements: 15
   - Sévérité: critical
   - Types d'événements: zero_grade_submission(8), rate_limit_exceeded(4), invalid_hmac_signature(3)
```

### 2. Tester le système de logging

```bash
cd server
node tools/test_security_logging.js
```

### 3. API d'administration

#### Authentification
Toutes les routes admin nécessitent le header `X-Admin-Token` avec la valeur définie dans `ADMIN_TOKEN`.

#### Endpoints disponibles :

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
- Débloquer une IP

**GET /admin/security/blocked**
- Liste des IP actuellement bloquées

**POST /admin/security/analyze**
```json
{
  "autoBlock": true  // Bloquer automatiquement les IP à haut risque
}
```

### 4. Configuration

#### Variables d'environnement (.env)
```
ADMIN_TOKEN=YOUR_TOKEN
```

#### Seuils configurables

Dans `SecurityLogAnalyzer.js` :
- `suspiciousThreshold: 5` - Nombre d'événements pour considérer une IP comme suspecte
- `updateInterval: 5 * 60 * 1000` - Fréquence de mise à jour des listes de blocage (5 min)

## Exemples d'utilisation

### Surveiller les attaques en temps réel

```bash
# Surveiller les logs en continu
tail -f server/logs/suspicious.log | grep "rate_limit_exceeded"

# Analyser les logs toutes les heures
*/60 * * * * cd /path/to/server && node tools/analyze_security_logs.js
```

### Bloquer manuellement une IP

```bash
curl -X POST http://localhost:5000/admin/security/block \
  -H "X-Admin-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.1.100", "reason": "Attaque détectée"}'
```

### Obtenir des statistiques

```bash
curl -H "X-Admin-Token: YOUR_TOKEN" \
  http://localhost:5000/admin/security/stats
```

## Fonctionnalités automatiques

### Blocage automatique
- Les IP avec plus de 10 événements suspects sont automatiquement ajoutées à la liste de surveillance
- Les IP avec des événements critiques répétés peuvent être bloquées automatiquement

### Rotation des logs
- Fichiers de logs limités à 5MB chacun
- Conservation de 5 fichiers de backup
- Nettoyage automatique des anciens logs

### Alertes recommandées
- IP à haut risque : blocage immédiat recommandé
- IP suspectes : surveillance renforcée
- Événements critiques : investigation manuelle requise

## Intégration avec des systèmes externes

### Firewall/Proxy
Le fichier `ip_blocklist.json` peut être utilisé par :
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

## Sécurité et conformité

- Les logs contiennent uniquement les informations nécessaires (pas de données personnelles)
- Les IP sont anonymisables si requis par RGPD
- Audit trail complet des actions administratives
- Chiffrement recommandé pour les fichiers de logs en production
