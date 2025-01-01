const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const student = await Student.findOne({ 
            _id: decoded._id,
            'sessions.token': token 
        });

        if (!student) {
            throw new Error('Please authenticate');
        }

        req.token = token;
        req.student = student;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Please authenticate' });
    }
};

module.exports = auth; 