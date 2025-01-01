const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        console.log('Database:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        console.log('Please make sure MongoDB is running.');
        console.log('Try running: mongod');
        process.exit(1);
    });

// Models
const Student = require('./models/Student');
const Quiz = require('./models/Quiz');
const Result = require('./models/Result');

// Authentication Routes
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const student = new Student({ name, email, password });
        await student.save();
        
        const token = jwt.sign(
            { _id: student._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        student.sessions = student.sessions.concat({ token });
        await student.save();
        
        res.status(201).json({ 
            success: true, 
            student: { _id: student._id, name: student.name },
            token 
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for:', email);
        
        const student = await Student.findOne({ email });
        if (!student) {
            console.log('Student not found');
            throw new Error('Invalid login credentials');
        }

        const isValidPassword = await student.validatePassword(password);
        console.log('Password valid:', isValidPassword);
        
        if (!isValidPassword) {
            throw new Error('Invalid login credentials');
        }

        const token = jwt.sign(
            { _id: student._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        student.sessions = student.sessions.concat({ token });
        await student.save();

        res.json({ 
            success: true, 
            student: { _id: student._id, name: student.name },
            token 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/logout', auth, async (req, res) => {
    try {
        req.student.sessions = req.student.sessions.filter(session => 
            session.token !== req.token
        );
        await req.student.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.json({ success: true });
    }
});

// Protected Routes
app.post('/api/results', auth, async (req, res) => {
    try {
        const { sectionTitle, stage, score, totalQuestions, answers } = req.body;
        
        // Find or create result document for this student
        let result = await Result.findOne({ student: req.student._id });
        if (!result) {
            result = new Result({ 
                student: req.student._id, 
                sections: [],
                overallProgress: 0 
            });
        }

        // Add or update section results
        const sectionIndex = result.sections.findIndex(s => 
            s.sectionTitle.toLowerCase() === sectionTitle.toLowerCase()
        );

        const sectionResult = {
            sectionTitle,
            stage,
            score,
            totalQuestions,
            answers,
            completedAt: new Date()
        };

        if (sectionIndex >= 0) {
            result.sections[sectionIndex] = sectionResult;
        } else {
            result.sections.push(sectionResult);
        }

        // Update overall progress (considering all sections)
        const totalSections = 4; // Total number of sections (including Micekings)
        const completedSections = new Set(result.sections.map(s => s.sectionTitle)).size;
        result.overallProgress = (completedSections / totalSections) * 100;

        await result.save();
        res.status(201).json({ success: true, result });
    } catch (error) {
        console.error('Error saving results:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

app.get('/api/verify-credentials', async (req, res) => {
    try {
        const { email, password } = req.query;
        const student = await Student.findOne({ email });
        
        if (!student) {
            return res.json({ exists: false });
        }

        const isValidPassword = await student.validatePassword(password);
        res.json({ 
            exists: true, 
            passwordValid: isValidPassword 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get student progress
app.get('/api/student/progress', auth, async (req, res) => {
    try {
        const result = await Result.findOne({ student: req.student._id });
        if (!result) {
            return res.json({
                overallProgress: 0,
                sections: {}
            });
        }
        
        const progress = {
            overallProgress: result.overallProgress,
            sections: {}
        };

        result.sections.forEach(section => {
            progress.sections[section.sectionTitle.toLowerCase()] = {
                completed: true,
                score: (section.score / section.totalQuestions) * 100,
                stage: section.stage
            };
        });
        
        res.json(progress);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start new section
app.post('/api/section/start', auth, async (req, res) => {
    try {
        const { sectionId } = req.body;
        const quiz = await Quiz.findOne({ 'sections.title': sectionId });
        
        if (!quiz) {
            throw new Error('Section not found');
        }

        res.json({ 
            success: true, 
            section: quiz.sections.find(s => s.title.toLowerCase() === sectionId)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this new route
app.get('/api/student/summary', auth, async (req, res) => {
    try {
        console.log('Fetching summary for student:', req.student._id);
        const result = await Result.findOne({ student: req.student._id });
        console.log('Found result:', result);
        
        // Initialize summary structure
        const summary = {
            sections: [
                {
                    title: 'Grammar',
                    completed: false,
                    score: 0,
                    weakAreas: []
                },
                {
                    title: 'Vocabulary',
                    completed: false,
                    score: 0,
                    weakAreas: []
                },
                {
                    title: 'Reading',
                    completed: false,
                    score: 0,
                    weakAreas: []
                },
                {
                    title: 'Micekings',
                    completed: false,
                    score: 0,
                    weakAreas: []
                }
            ],
            recommendations: []
        };

        if (result) {
            // Process sections from the result
            result.sections.forEach(resultSection => {
                console.log('Processing section:', resultSection.sectionTitle);
                const section = summary.sections.find(s => 
                    s.title.toLowerCase() === resultSection.sectionTitle.toLowerCase()
                );
                
                if (section) {
                    section.completed = true;
                    section.score = (resultSection.score / resultSection.totalQuestions) * 100;
                    
                    // Analyze incorrect answers to identify weak areas
                    resultSection.answers.forEach(answer => {
                        if (!answer.correct && answer.topic) {
                            if (!section.weakAreas.includes(answer.topic)) {
                                section.weakAreas.push(answer.topic);
                            }
                        }
                    });
                }
            });

            // Generate recommendations
            summary.sections.forEach(section => {
                if (section.completed && section.score < 60) {
                    summary.recommendations.push({
                        area: section.title,
                        description: `Focus on improving ${section.title.toLowerCase()} skills`,
                        resources: `Check recommended ${section.title.toLowerCase()} exercises`
                    });
                }
            });
        }

        console.log('Sending summary:', summary);
        res.json(summary);
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add this temporary route to clear results (remove in production)
app.post('/api/reset-progress', auth, async (req, res) => {
    try {
        await Result.deleteMany({ student: req.student._id });
        res.json({ success: true, message: 'Progress reset successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this new route for token refresh
app.post('/api/refresh-token', async (req, res) => {
    try {
        const oldToken = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
        const student = await Student.findOne({ 
            _id: decoded._id,
            'sessions.token': oldToken 
        });
        
        if (!student) {
            throw new Error('Invalid token');
        }
        
        // Generate new token
        const newToken = jwt.sign({ _id: student._id }, process.env.JWT_SECRET);
        
        // Update session
        student.sessions = student.sessions.filter(s => s.token !== oldToken);
        student.sessions.push({ token: newToken });
        await student.save();
        
        res.json({ success: true, token: newToken });
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 