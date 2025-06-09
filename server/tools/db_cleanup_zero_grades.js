require('dotenv').config();
const mongoose = require('mongoose');
const ranksModel = require('../models/ranks.model');

async function cleanupZeroGrades() {
    try {        // Connexion à MongoDB
        console.log('Connexion à MongoDB...');
        const mongoURL = process.env.MONGO_URI;
        await mongoose.connect(mongoURL);
        console.log('✓ Connecté à MongoDB');

        // 1. Compter tous les enregistrements
        const totalCount = await ranksModel.countDocuments();
        console.log(`\nTotal des enregistrements dans la base : ${totalCount}`);

        // 2. Identifier les enregistrements avec grade = 0
        const zeroGradeRecords = await ranksModel.find({ grade: 0 });
        console.log(`\nEnregistrements avec grade = 0 : ${zeroGradeRecords.length}`);

        if (zeroGradeRecords.length > 0) {
            console.log('\nExemples d\'enregistrements avec grade = 0 :');
            zeroGradeRecords.slice(0, 5).forEach((record, index) => {
                console.log(`${index + 1}. ID: ${record._id}, Year: ${record.year}, Dept: ${record.departement}, Grade: ${record.grade}`);
            });

            // 3. Demander confirmation avant suppression
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise((resolve) => {
                rl.question(`\nÊtes-vous sûr de vouloir supprimer ces ${zeroGradeRecords.length} enregistrements avec grade = 0 ? (oui/non): `, resolve);
            });

            rl.close();

            if (answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'o') {
                // 4. Supprimer les enregistrements avec grade = 0
                console.log('\nSuppression en cours...');
                const deleteResult = await ranksModel.deleteMany({ grade: 0 });
                console.log(`✓ ${deleteResult.deletedCount} enregistrements supprimés`);

                // 5. Vérifier le résultat
                const newTotalCount = await ranksModel.countDocuments();
                const remainingZeroGrades = await ranksModel.countDocuments({ grade: 0 });
                
                console.log(`\nRésultats après nettoyage :`);
                console.log(`- Total des enregistrements : ${newTotalCount}`);
                console.log(`- Enregistrements avec grade = 0 restants : ${remainingZeroGrades}`);
                console.log(`- Enregistrements supprimés : ${totalCount - newTotalCount}`);

                // 6. Afficher quelques statistiques
                const gradeStats = await ranksModel.aggregate([
                    {
                        $group: {
                            _id: null,
                            minGrade: { $min: { $toDouble: "$grade" } },
                            maxGrade: { $max: { $toDouble: "$grade" } },
                            avgGrade: { $avg: { $toDouble: "$grade" } },
                            count: { $sum: 1 }
                        }
                    }
                ]);

                if (gradeStats.length > 0) {
                    const stats = gradeStats[0];
                    console.log(`\nStatistiques des notes après nettoyage :`);
                    console.log(`- Note minimale : ${stats.minGrade}`);
                    console.log(`- Note maximale : ${stats.maxGrade}`);
                    console.log(`- Note moyenne : ${stats.avgGrade.toFixed(2)}`);
                    console.log(`- Nombre total d'enregistrements : ${stats.count}`);
                }

            } else {
                console.log('Suppression annulée.');
            }
        } else {
            console.log('\n✓ Aucun enregistrement avec grade = 0 trouvé.');
        }

    } catch (error) {
        console.error('Erreur lors du nettoyage:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Déconnecté de MongoDB');
    }
}

// Exécuter le script
cleanupZeroGrades();
