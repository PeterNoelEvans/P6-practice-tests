const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: String,
    options: [String],
    correctAnswer: String,
    explanation: String  // Optional explanation for answers
});

const sectionSchema = new mongoose.Schema({
    title: String,
    description: String,
    questions: [questionSchema],
    timeLimit: Number,  // Time limit in minutes (optional)
    passingScore: Number  // Minimum score to pass (optional)
});

const quizSchema = new mongoose.Schema({
    sections: [sectionSchema],
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Quiz', quizSchema); 