const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('../models/Student');

async function deleteUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await Student.deleteOne({ email: 'sjchpb@gmail.com' });
        console.log('Delete result:', result);
        
        if (result.deletedCount > 0) {
            console.log('User successfully deleted');
        } else {
            console.log('User not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

deleteUser(); 