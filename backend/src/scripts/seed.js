import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Holiday from '../models/Holiday.js';
import logger from '../utils/logger.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Holiday.deleteMany({});

    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@company.com',
      password: 'Admin@123',
      role: 'admin',
      employeeId: 'EMP001',
      department: 'Operations',
      designation: 'System Administrator',
      dateOfJoining: new Date('2024-01-01'),
      phone: '+1234567890',
      isActive: true
    });

    const managerUser = await User.create({
      firstName: 'John',
      lastName: 'Manager',
      email: 'manager@company.com',
      password: 'Manager@123',
      role: 'manager',
      employeeId: 'EMP002',
      department: 'Engineering',
      designation: 'Engineering Manager',
      dateOfJoining: new Date('2024-01-15'),
      phone: '+1234567891',
      isActive: true
    });

    const employeeUser = await User.create({
      firstName: 'Jane',
      lastName: 'Employee',
      email: 'employee@company.com',
      password: 'Employee@123',
      role: 'employee',
      employeeId: 'EMP003',
      department: 'Engineering',
      designation: 'Software Developer',
      manager: managerUser._id,
      dateOfJoining: new Date('2024-02-01'),
      phone: '+1234567892',
      isActive: true
    });

    const currentYear = new Date().getFullYear();
    const holidays = [
      {
        name: 'New Year\'s Day',
        date: new Date(currentYear, 0, 1),
        type: 'public',
        isRecurring: true
      },
      {
        name: 'Independence Day',
        date: new Date(currentYear, 6, 4),
        type: 'public',
        isRecurring: true
      },
      {
        name: 'Christmas',
        date: new Date(currentYear, 11, 25),
        type: 'public',
        isRecurring: true
      },
      {
        name: 'Company Foundation Day',
        date: new Date(currentYear, 2, 15),
        type: 'company',
        isRecurring: true
      }
    ];

    await Holiday.insertMany(holidays);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Default Users Created:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:');
    console.log('  Email: admin@company.com');
    console.log('  Password: Admin@123');
    console.log('\nManager:');
    console.log('  Email: manager@company.com');
    console.log('  Password: Manager@123');
    console.log('\nEmployee:');
    console.log('  Email: employee@company.com');
    console.log('  Password: Employee@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change these passwords in production!\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
