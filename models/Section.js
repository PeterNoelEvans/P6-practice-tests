const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    id: String,
    title: String,
    type: {
        type: String,
        enum: ['regular', 'advanced']
    },
    description: String,
    bulletPoints: [String],
    totalQuestions: Number,
    timeLimit: Number
});

module.exports = mongoose.model('Section', sectionSchema); 