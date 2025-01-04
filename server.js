const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');

dotenv.config();

const app = express();

// Add security headers
app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// SSL configuration
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync('ssl/private.key'),
        cert: fs.readFileSync('ssl/certificate.pem'),
        secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
        ciphers: [
            "ECDHE-RSA-AES128-GCM-SHA256",
            "ECDHE-RSA-AES256-GCM-SHA384",
            "ECDHE-RSA-AES128-SHA256"
        ].join(':'),
        honorCipherOrder: true
    };
    console.log('SSL certificates loaded successfully');
} catch (error) {
    console.log('SSL certificates not found:', error);
    sslOptions = null;
}

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
        console.log('\n=== New Score Submission ===');
        console.log('1. Received data:', {
            sectionTitle,
            score,
            totalQuestions,
            timestamp: new Date().toISOString()
        });

        let result = await Result.findOne({ student: req.student._id });
        console.log('2. Existing sections:', result?.sections.map(s => ({
            title: s.sectionTitle,
            score: s.score,
            completed: s.completed
        })));

        if (!result) {
            result = new Result({ 
                student: req.student._id, 
                sections: [],
                overallProgress: 0 
            });
            console.log('3. Created new result document');
        }

        if (!sectionTitle) {
            throw new Error('Section title is required');
        }
        
        const normalizedTitle = sectionTitle.toLowerCase();
        const sectionIndex = result.sections.findIndex(s => 
            s.sectionTitle && s.sectionTitle.toLowerCase() === normalizedTitle
        );

        console.log('4. Section lookup:', {
            lookingFor: normalizedTitle,
            found: sectionIndex >= 0,
            existingScore: sectionIndex >= 0 ? result.sections[sectionIndex].score : null
        });

        const sectionResult = {
            sectionTitle,
            stage,
            score,
            totalQuestions,
            answers,
            completedAt: new Date()
        };

        // Validate score before saving
        if (typeof score !== 'number' || score < 0 || score > 100) {
            console.warn('Invalid score detected:', {
                score,
                type: typeof score,
                calculation: `${score}/${totalQuestions} * 100`
            });
        }

        console.log('5. New section data:', {
            title: sectionResult.sectionTitle,
            score: sectionResult.score,
            totalQuestions: sectionResult.totalQuestions,
            scoreType: typeof sectionResult.score
        });

        if (sectionIndex >= 0) {
            result.sections[sectionIndex] = sectionResult;
            console.log('6. Updated existing section');
        } else {
            result.sections.push(sectionResult);
            console.log('6. Added new section');
        }

        console.log('7. Final sections state:', result.sections.map(s => ({
            title: s.sectionTitle,
            score: s.score
        })));

        await result.save();
        console.log('8. Save completed');
        console.log('=== End Score Submission ===\n');

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
            // Handle both regular and advanced sections
            const sectionKey = section.sectionTitle.toLowerCase();
            progress.sections[sectionKey] = {
                completed: true,
                score: section.score,
                stage: section.stage
            };
            
            // Calculate overall progress including advanced sections
            const totalSections = 7;  // 4 regular + 3 advanced sections
            progress.overallProgress = Math.round(
                (Object.keys(progress.sections).length / totalSections) * 100
            );
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

// Add this new route for class overview
app.get('/api/admin/class-progress', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.student.name !== 'Peter Evans') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        // Get all students and their results
        const results = await Result.find({})
            .populate('student', 'name email')
            .select('sections overallProgress');

        const classProgress = results.map(result => ({
            studentName: result.student.name,
            email: result.student.email,
            overallProgress: result.overallProgress,
            sectionScores: {
                grammar: getScoreForSection(result.sections, 'Grammar'),
                vocabulary: getScoreForSection(result.sections, 'Vocabulary'),
                reading: getScoreForSection(result.sections, 'Reading'),
                micekings: getScoreForSection(result.sections, 'Micekings') || 
                          getScoreForSection(result.sections, 'Geronimo')
            }
        }));

        res.json(classProgress);
    } catch (error) {
        console.error('Error fetching class progress:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to get score for a specific section
function getScoreForSection(sections, sectionTitle) {
    const section = sections.find(s => 
        s.sectionTitle.toLowerCase() === sectionTitle.toLowerCase()
    );
    return section ? (section.score / section.totalQuestions) * 100 : 0;
}

// Add route to reset individual section
app.post('/api/reset-section', auth, async (req, res) => {
    try {
        const { sectionTitle } = req.body;
        
        // Find student's results
        const result = await Result.findOne({ student: req.student._id });
        if (result) {
            // Remove the specified section
            result.sections = result.sections.filter(s => 
                s.sectionTitle.toLowerCase() !== sectionTitle.toLowerCase()
            );
            
            // Update overall progress
            const totalSections = 4;
            const completedSections = new Set(result.sections.map(s => s.sectionTitle)).size;
            result.overallProgress = (completedSections / totalSections) * 100;
            
            await result.save();
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error resetting section:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;  // Standard HTTPS port

if (sslOptions) {
    // HTTPS Server
    https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
        console.log(`Access securely using:`);
        console.log(`https://[your-ip-address]:${HTTPS_PORT}`);
    });

    // Create HTTP server that redirects to HTTPS
    const httpApp = express();
    httpApp.use((req, res) => {
        res.redirect(`https://${req.hostname}:${HTTPS_PORT}${req.url}`);
    });
    
    httpApp.listen(PORT, '0.0.0.0', () => {
        console.log(`HTTP->HTTPS redirect server running on port ${PORT}`);
    });

} else {
    // HTTP Server (fallback)
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`HTTP Server running on port ${PORT}`);
        console.log('Access using:');
        console.log(`http://[your-ip-address]:${PORT}`);
    });
} 