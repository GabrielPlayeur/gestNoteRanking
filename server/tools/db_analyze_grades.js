require('dotenv').config();
const mongoose = require('mongoose');
const ranksModel = require('../models/ranks.model.js');

async function analyzeGrades() {
    try {
        console.log('Connexion à MongoDB...');
        const mongoURI = process.env.MONGO_URI;
        await mongoose.connect(mongoURI);
        console.log('✓ Connecté à MongoDB');

        // Analyse détaillée des grades
        console.log('\n=== ANALYSE DES GRADES ===');

        // Distribution des grades
        const gradeDistribution = await ranksModel.aggregate([
            {
                $addFields: {
                    gradeValue: { $toDouble: "$grade" }
                }
            },
            {
                $group: {
                    _id: "$gradeValue",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

        console.log('\nDistribution des grades :');
        gradeDistribution.forEach(item => {
            console.log(`Grade ${item._id} : ${item.count} enregistrements`);
        });

        // Enregistrements suspects (grade très bas)
        const suspiciousGrades = await ranksModel.find({
            $expr: { $lte: [{ $toDouble: "$grade" }, 1] }
        }).sort({ grade: 1 });

        console.log(`\nEnregistrements avec grade ≤ 1 : ${suspiciousGrades.length}`);
        if (suspiciousGrades.length > 0) {
            console.log('Détails des 10 premiers :');
            suspiciousGrades.slice(0, 10).forEach((record, index) => {
                console.log(`${index + 1}. Grade: ${record.grade}, Year: ${record.year}, Dept: ${record.departement}, Updated: ${record.updatedAt}`);
            });
        }

        // Enregistrements par département
        const deptStats = await ranksModel.aggregate([
            {
                $group: {
                    _id: "$departement",
                    count: { $sum: 1 },
                    avgGrade: { $avg: { $toDouble: "$grade" } },
                    minGrade: { $min: { $toDouble: "$grade" } },
                    maxGrade: { $max: { $toDouble: "$grade" } }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

        console.log('\nStatistiques par département :');
        totalCount = 0;
        deptStats.forEach(dept => {
            console.log(`Dept ${dept._id}: ${dept.count} étudiants, Moyenne: ${dept.avgGrade.toFixed(2)}, Min: ${dept.minGrade}, Max: ${dept.maxGrade}`);
            totalCount += dept.count;
        });
        console.log(`Total d'étudiants analysés : ${totalCount}`);

    } catch (error) {
        console.error('Erreur lors de l\'analyse:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Déconnecté de MongoDB');
    }
}

analyzeGrades();
