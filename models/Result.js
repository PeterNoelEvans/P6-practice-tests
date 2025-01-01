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

module.exports = mongoose.model('Result', resultSchema); 