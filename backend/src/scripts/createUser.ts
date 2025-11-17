import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../models/mongodb/User';

dotenv.config();

const createInitialUser = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin user exists
    const existingUser = await User.findOne({ username: 'admin' });
    if (existingUser) {
      console.log('⚠️  Admin user already exists');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const password = process.argv[2] || 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      passwordHash,
      roles: ['admin', 'user'],
      isActive: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log('   Username: admin');
    console.log(`   Password: ${password}`);
    console.log('   Email: admin@example.com');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  }
};

createInitialUser();

