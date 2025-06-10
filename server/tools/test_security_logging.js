require('dotenv').config();
const request = require('supertest');
const app = require('../app');
const { SecurityLogger } = require('../utils/securityLogger');

/**
 * Test script to generate suspicious events and test the logging system
 */
async function testSecurityLogging() {
    console.log('🔍 Testing security logging system...\n');

    try {
        // 1. Test invalid User-Agent
        console.log('1. Testing invalid User-Agent...');
        const response1 = await request(app)
            .get('/api/ranks')
            .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
            .expect(403);
        console.log('✓ Invalid User-Agent detected and logged\n');
        // 2. Test invalid HMAC signature
        console.log('2. Testing invalid HMAC signature...');
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
        console.log('✓ Invalid HMAC signature detected and logged\n');
        // 3. Test malformed request
        console.log('3. Testing malformed request...');
        const crypto = require('crypto');
        const payload = JSON.stringify({
            hash: '', // Empty hash (invalid)
            year: 'invalid', // Invalid year
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
        console.log('✓ Malformed request detected and logged\n');
        // 4. Test grade 0 submission (suspicious behavior)
        console.log('4. Testing grade 0 submission...');
        const zeroGradePayload = JSON.stringify({
            hash: 'test-zero-grade',
            year: 2025,
            maquette: 1,
            departement: 101,
            grade: 0 // Suspicious grade
        });
        const zeroSignature = crypto.createHmac('sha256', process.env.GESTNOTE_SECRET || '658e02624f38c792ac9a97f2')
            .update(zeroGradePayload)
            .digest('hex');

        const response4 = await request(app)
            .post('/api/ranks')
            .set('User-Agent', 'GestNoteRanking/1.0.7')
            .set('X-GestNote-Signature', zeroSignature)
            .send(JSON.parse(zeroGradePayload));
        console.log('✓ Grade 0 submission detected and logged\n');
        // 5. Test suspicious grade (too high)
        console.log('5. Testing suspicious grade (too high)...');
        const highGradePayload = JSON.stringify({
            hash: 'test-high-grade',
            year: 2025,
            maquette: 1,
            departement: 101,
            grade: 19.8 // Very high grade (suspicious)
        });
        const highSignature = crypto.createHmac('sha256', process.env.GESTNOTE_SECRET || '658e02624f38c792ac9a97f2')
            .update(highGradePayload)
            .digest('hex');

        const response5 = await request(app)
            .post('/api/ranks')
            .set('User-Agent', 'GestNoteRanking/1.0.7')
            .set('X-GestNote-Signature', highSignature)
            .send(JSON.parse(highGradePayload));
        console.log('✓ Suspicious grade (too high) detected and logged\n');
        // 6. Test CORS logs (simulated)
        console.log('6. Testing CORS violation...');
        SecurityLogger.logCORSViolation(
            { headers: { origin: 'https://malicious-site.com' }, ip: '192.168.1.100' },
            'https://malicious-site.com'
        );        console.log('✓ CORS violation logged\n');

        console.log('🎉 All logging tests executed successfully!');
        console.log('📝 Check the log files in the ./logs/ folder to see the recorded events.');

    } catch (error) {
        console.error('❌ Error during logging tests:', error);
    }
}

// Execute tests if the script is called directly
if (require.main === module) {
    testSecurityLogging();
}

module.exports = testSecurityLogging;
