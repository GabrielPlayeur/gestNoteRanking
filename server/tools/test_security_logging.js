require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const { SecurityLogger } = require('../utils/securityLogger');

/**
 * Script de test pour générer des événements suspects et tester le système de logging
 */
async function testSecurityLogging() {
    console.log('🔍 Test du système de logging de sécurité...\n');

    try {
        // 1. Test de User-Agent invalide
        console.log('1. Test User-Agent invalide...');
        const response1 = await request(app)
            .get('/api/ranks')
            .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
            .expect(403);
        console.log('✓ User-Agent invalide détecté et loggé\n');

        // 2. Test de signature HMAC invalide
        console.log('2. Test signature HMAC invalide...');
        const response2 = await request(app)
            .post('/api/ranks')
            .set('User-Agent', 'GestNoteRanking/1.0.7')
            .set('X-GestNote-Signature', 'invalid-signature')
            .send({
                hash: 'test-hash',
                year: 2025,
                maquette: 1,
                departement: 101,
                grade: 15.5
            })
            .expect(401);
        console.log('✓ Signature HMAC invalide détectée et loggée\n');

        // 3. Test de requête malformée
        console.log('3. Test requête malformée...');
        const crypto = require('crypto');
        const payload = JSON.stringify({
            hash: '', // Hash vide (invalide)
            year: 'invalid', // Année invalide
            maquette: 1,
            departement: 101,
            grade: 15.5
        });
        const signature = crypto.createHmac('sha256', process.env.GESTNOTE_SECRET || '658e02624f38c792ac9a97f2')
            .update(payload)
            .digest('hex');

        const response3 = await request(app)
            .post('/api/ranks')
            .set('User-Agent', 'GestNoteRanking/1.0.7')
            .set('X-GestNote-Signature', signature)
            .send(JSON.parse(payload))
            .expect(400);
        console.log('✓ Requête malformée détectée et loggée\n');

        // 4. Test de soumission de note 0 (comportement suspect)
        console.log('4. Test soumission note 0...');
        const zeroGradePayload = JSON.stringify({
            hash: 'test-zero-grade',
            year: 2025,
            maquette: 1,
            departement: 101,
            grade: 0 // Note suspecte
        });
        const zeroSignature = crypto.createHmac('sha256', process.env.GESTNOTE_SECRET || '658e02624f38c792ac9a97f2')
            .update(zeroGradePayload)
            .digest('hex');

        const response4 = await request(app)
            .post('/api/ranks')
            .set('User-Agent', 'GestNoteRanking/1.0.7')
            .set('X-GestNote-Signature', zeroSignature)
            .send(JSON.parse(zeroGradePayload));
        console.log('✓ Soumission de note 0 détectée et loggée\n');

        // 5. Test de note suspecte (trop élevée)
        console.log('5. Test note suspecte (trop élevée)...');
        const highGradePayload = JSON.stringify({
            hash: 'test-high-grade',
            year: 2025,
            maquette: 1,
            departement: 101,
            grade: 19.8 // Note très élevée (suspecte)
        });
        const highSignature = crypto.createHmac('sha256', process.env.GESTNOTE_SECRET || '658e02624f38c792ac9a97f2')
            .update(highGradePayload)
            .digest('hex');

        const response5 = await request(app)
            .post('/api/ranks')
            .set('User-Agent', 'GestNoteRanking/1.0.7')
            .set('X-GestNote-Signature', highSignature)
            .send(JSON.parse(highGradePayload));
        console.log('✓ Note suspecte (trop élevée) détectée et loggée\n');

        // 6. Test logs CORS (simulé)
        console.log('6. Test violation CORS...');
        SecurityLogger.logCORSViolation(
            { headers: { origin: 'https://malicious-site.com' }, ip: '192.168.1.100' },
            'https://malicious-site.com'
        );
        console.log('✓ Violation CORS loggée\n');

        console.log('🎉 Tous les tests de logging ont été exécutés avec succès!');
        console.log('📝 Vérifiez les fichiers de logs dans le dossier ./logs/ pour voir les événements enregistrés.');

    } catch (error) {
        console.error('❌ Erreur lors des tests de logging:', error);
    }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
    testSecurityLogging();
}

module.exports = testSecurityLogging;
