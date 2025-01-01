const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Student = require('../models/Student');

async function migrateUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all users without passwords
        const users = await Student.find({ password: { $exists: false } });
        
        // Set a default password for existing users
        const defaultPassword = 'changeme123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        for (const user of users) {
            user.password = hashedPassword;
            await user.save();
            console.log(`Updated user: ${user.email}`);
        }

        console.log('Migration complete!');
        console.log(`Default password for existing users: ${defaultPassword}`);
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

migrateUsers(); 