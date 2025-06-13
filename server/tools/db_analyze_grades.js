require('dotenv').config();
const mongoose = require('mongoose');
const ranksModel = require('../models/ranks.model.js');

async function analyzeGrades() {
    try {        console.log('Connecting to MongoDB...');
        const mongoURI = process.env.MONGO_URI;
        await mongoose.connect(mongoURI);
        console.log('✓ Connected to MongoDB');

        // Detailed grade analysis
        console.log('\n=== GRADE ANALYSIS ===');

        // Grade distribution
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
        ]);        console.log('\nGrade distribution:');
        gradeDistribution.forEach(item => {
            console.log(`Grade ${item._id}: ${item.count} records`);
        });

        // Suspicious records (very low grades)
        const suspiciousGrades = await ranksModel.find({
            $expr: { $lte: [{ $toDouble: "$grade" }, 1] }
        }).sort({ grade: 1 });

        console.log(`\nRecords with grade ≤ 1: ${suspiciousGrades.length}`);
        if (suspiciousGrades.length > 0) {
            console.log('Details of first 10:');
            suspiciousGrades.slice(0, 10).forEach((record, index) => {
                console.log(`${index + 1}. Grade: ${record.grade}, Year: ${record.year}, Dept: ${record.departement}, Updated: ${record.updatedAt}`);
            });
        }        // Records by department
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

        console.log('\nStatistics by department:');
        totalCount = 0;
        deptStats.forEach(dept => {
            console.log(`Dept ${dept._id}: ${dept.count} students, Average: ${dept.avgGrade.toFixed(2)}, Min: ${dept.minGrade}, Max: ${dept.maxGrade}`);
            totalCount += dept.count;
        });
        console.log(`Total students analyzed: ${totalCount}`);    } catch (error) {
        console.error('Error during analysis:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');
    }
}

analyzeGrades();
