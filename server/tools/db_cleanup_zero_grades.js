require('dotenv').config();
const mongoose = require('mongoose');
const ranksModel = require('../models/ranks.model');

async function cleanupZeroGrades() {
    try {
    // Connection to MongoDB
        console.log('Connecting to MongoDB...');
        const mongoURL = process.env.MONGO_URI;
        await mongoose.connect(mongoURL);
        console.log('✓ Connected to MongoDB');

        // 1. Count all records
        const totalCount = await ranksModel.countDocuments();
        console.log(`\nTotal records in database: ${totalCount}`);

        // 2. Identify records with grade = 0
        const zeroGradeRecords = await ranksModel.find({ grade: 0 });
        console.log(`\nRecords with grade = 0: ${zeroGradeRecords.length}`);

        if (zeroGradeRecords.length > 0) {
            console.log('\nExamples of records with grade = 0:');
            zeroGradeRecords.slice(0, 5).forEach((record, index) => {
                console.log(`${index + 1}. ID: ${record._id}, Year: ${record.year}, Dept: ${record.departement}, Grade: ${record.grade}`);
            });

            // 3. Ask for confirmation before deletion
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise((resolve) => {
                rl.question(`\nAre you sure you want to delete these ${zeroGradeRecords.length} records with grade = 0? (yes/no): `, resolve);
            });

            rl.close();
            if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                // 4. Delete records with grade = 0
                console.log('\nDeletion in progress...');
                const deleteResult = await ranksModel.deleteMany({ grade: 0 });
                console.log(`✓ ${deleteResult.deletedCount} records deleted`);

                // 5. Verify the result
                const newTotalCount = await ranksModel.countDocuments();
                const remainingZeroGrades = await ranksModel.countDocuments({ grade: 0 });

                console.log(`\nResults after cleanup:`);
                console.log(`- Total records: ${newTotalCount}`);
                console.log(`- Remaining records with grade = 0: ${remainingZeroGrades}`);
                console.log(`- Records deleted: ${totalCount - newTotalCount}`);

                // 6. Display some statistics
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
                    console.log(`\nGrade statistics after cleanup:`);
                    console.log(`- Minimum grade: ${stats.minGrade}`);
                    console.log(`- Maximum grade: ${stats.maxGrade}`);
                    console.log(`- Average grade: ${stats.avgGrade.toFixed(2)}`);
                    console.log(`- Total number of records: ${stats.count}`);
                }
            } else {
                console.log('Deletion cancelled.');
            }
        } else {
            console.log('\n✓ No records with grade = 0 found.');
        }

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');
    }
}

// Execute the script
cleanupZeroGrades();
