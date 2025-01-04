const mongoose = require('mongoose');
require('dotenv').config();
const Result = require('../models/Result');

async function cleanupSections() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        console.log('Database:', mongoose.connection.name);

        // Get all results
        const results = await Result.find({});
        console.log(`Found ${results.length} result documents`);

        // Process each student's results
        for (const result of results) {
            console.log(`\nProcessing student: ${result.student}`);
            
            // Find all advanced reading sections
            const readingSections = result.sections.filter(section => {
                const sectionName = section.sectionTitle?.toLowerCase() || '';
                return sectionName.includes('advanced') && sectionName.includes('reading');
            });

            if (readingSections.length > 0) {
                console.log(`Found ${readingSections.length} advanced reading sections`);
                
                // Keep only the most recent score
                const mostRecent = readingSections.reduce((latest, current) => {
                    if (!latest || current.completedAt > latest.completedAt) {
                        return current;
                    }
                    return latest;
                });

                console.log('Selected score after normalization:', mostRecent.score);

                // Remove all advanced reading sections
                result.sections = result.sections.filter(section => {
                    const sectionName = section.sectionTitle?.toLowerCase() || '';
                    return !(sectionName.includes('advanced') && sectionName.includes('reading'));
                });

                // Add back the most recent one with standardized name
                result.sections.push({
                    ...mostRecent,
                    sectionTitle: 'advancedreading',
                    score: mostRecent.score  // Keep original score without modification
                });

                // Save the changes
                await result.save();
                console.log('Updated sections:', result.sections.map(s => ({
                    title: s.sectionTitle,
                    score: s.score,
                    completedAt: s.completedAt
                })));
            }
        }

        console.log('\nCleanup completed successfully!');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the cleanup
cleanupSections(); 