const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionText: String,
    selectedAnswer: String,
    correct: Boolean
});

const sectionResultSchema = new mongoose.Schema({
    sectionTitle: String,
    stage: {
        type: Number,
        default: 1
    },
    score: Number,
    timeSpent: Number,
    totalQuestions: Number,
    answers: [answerSchema],
    completedAt: {
        type: Date,
        default: Date.now
    }
});

const resultSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    sections: [sectionResultSchema],
    overallProgress: {
        type: Number,
        default: 0
    }
});

// Add logging to track any modifications
resultSchema.pre('save', function(next) {
    console.log('Pre-save sections:', this.sections.map(s => ({
        title: s.sectionTitle,
        score: s.score,
        originalScore: s._doc?.score // Check if score is being modified
    })));
    next();
});

module.exports = mongoose.model('Result', resultSchema); 