const mongoose = require('mongoose');
require('dotenv').config();
const Result = require('../models/Result');

async function viewResults() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const results = await Result.find({});
        
        results.forEach(result => {
            console.log('\nStudent:', result.student);
            console.log('Sections:');
            result.sections.forEach(section => {
                console.log({
                    title: section.sectionTitle,
                    score: section.score,
                    totalQuestions: section.totalQuestions,
                    completedAt: section.completedAt
                });
            });
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

viewResults(); 