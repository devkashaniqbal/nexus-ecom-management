import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Project from '../models/Project.js';
import Timesheet from '../models/Timesheet.js';
import Asset from '../models/Asset.js';
import Expense from '../models/Expense.js';
import Leave from '../models/Leave.js';
import Announcement from '../models/Announcement.js';
import KnowledgeBase from '../models/KnowledgeBase.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedDemoData = async () => {
  try {
    console.log('🌱 Starting demo data seeding...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Attendance.deleteMany({});
    await Project.deleteMany({});
    await Timesheet.deleteMany({});
    await Asset.deleteMany({});
    await Expense.deleteMany({});
    await Leave.deleteMany({});
    await Announcement.deleteMany({});
    await KnowledgeBase.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create Users
    console.log('👥 Creating users...');
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@nexusecom.com',
      password: 'Admin@123',
      employeeId: 'EMP001',
      role: 'admin',
      department: 'Management',
      designation: 'System Administrator',
      dateOfJoining: new Date('2023-01-01'),
      phoneNumber: '+1234567890',
      isActive: true,
    });

    const managerUser = await User.create({
      firstName: 'John',
      lastName: 'Manager',
      email: 'manager@nexusecom.com',
      password: 'Manager@123',
      employeeId: 'EMP002',
      role: 'manager',
      department: 'Development',
      designation: 'Engineering Manager',
      dateOfJoining: new Date('2023-02-01'),
      phoneNumber: '+1234567891',
      isActive: true,
    });

    const employees = [];
    const employeeData = [
      { firstName: 'Sarah', lastName: 'Developer', email: 'sarah@nexusecom.com', department: 'Development', designation: 'Senior Developer' },
      { firstName: 'Mike', lastName: 'Smith', email: 'mike@nexusecom.com', department: 'Development', designation: 'Full Stack Developer' },
      { firstName: 'Emily', lastName: 'Johnson', email: 'emily@nexusecom.com', department: 'Design', designation: 'UI/UX Designer' },
      { firstName: 'David', lastName: 'Brown', email: 'david@nexusecom.com', department: 'Marketing', designation: 'Marketing Specialist' },
      { firstName: 'Lisa', lastName: 'Wilson', email: 'lisa@nexusecom.com', department: 'HR', designation: 'HR Coordinator' },
      { firstName: 'James', lastName: 'Taylor', email: 'james@nexusecom.com', department: 'Development', designation: 'Backend Developer' },
      { firstName: 'Emma', lastName: 'Davis', email: 'emma@nexusecom.com', department: 'QA', designation: 'QA Engineer' },
      { firstName: 'Robert', lastName: 'Anderson', email: 'robert@nexusecom.com', department: 'Development', designation: 'Frontend Developer' },
    ];

    for (let i = 0; i < employeeData.length; i++) {
      const emp = await User.create({
        ...employeeData[i],
        password: 'Employee@123',
        employeeId: `EMP${String(i + 3).padStart(3, '0')}`,
        role: 'employee',
        dateOfJoining: new Date(2023, i % 12, (i * 3) % 28 + 1),
        phoneNumber: `+123456789${i + 2}`,
        isActive: true,
      });
      employees.push(emp);
    }

    console.log(`✅ Created ${employees.length + 2} users\n`);

    // Create Projects
    console.log('📊 Creating projects...');
    const projects = await Project.create([
      {
        projectId: 'PROJ001',
        name: 'E-Commerce Platform Redesign',
        description: 'Complete overhaul of the existing e-commerce platform with modern UI/UX',
        clientName: 'TechCorp Inc.',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        status: 'active',
        manager: managerUser._id,
        teamMembers: [employees[0]._id, employees[1]._id, employees[2]._id, employees[7]._id],
        budget: 150000,
        priority: 'high',
      },
      {
        projectId: 'PROJ002',
        name: 'Mobile App Development',
        description: 'Native iOS and Android app for customer engagement',
        clientName: 'RetailMax LLC',
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-08-15'),
        status: 'active',
        manager: managerUser._id,
        teamMembers: [employees[1]._id, employees[5]._id],
        budget: 100000,
        priority: 'high',
      },
      {
        projectId: 'PROJ003',
        name: 'Marketing Campaign Website',
        description: 'Landing pages and campaign microsites',
        clientName: 'BrandVision',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-04-30'),
        status: 'completed',
        manager: managerUser._id,
        teamMembers: [employees[2]._id, employees[3]._id, employees[7]._id],
        budget: 35000,
        priority: 'medium',
      },
      {
        projectId: 'PROJ004',
        name: 'Internal HR Management System',
        description: 'Custom HRMS for employee management',
        clientName: 'Internal',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-12-31'),
        status: 'active',
        manager: managerUser._id,
        teamMembers: [employees[0]._id, employees[4]._id, employees[6]._id],
        budget: 80000,
        priority: 'medium',
      },
    ]);
    console.log(`✅ Created ${projects.length} projects\n`);

    // Create Attendance Records (Last 30 days)
    console.log('⏰ Creating attendance records...');
    const attendanceRecords = [];
    const today = new Date();
    const allUsers = [adminUser, managerUser, ...employees];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const user of allUsers) {
        // 90% attendance rate
        if (Math.random() > 0.1) {
          const checkIn = new Date(date);
          checkIn.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);

          const checkOut = new Date(date);
          checkOut.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0);

          const totalBreakTime = 30 + Math.floor(Math.random() * 30); // 30-60 mins

          attendanceRecords.push({
            userId: user._id,
            date: new Date(date.setHours(0, 0, 0, 0)),
            checkInTime: checkIn,
            checkOutTime: checkOut,
            totalBreakTime,
            workHours: ((checkOut - checkIn) / (1000 * 60 * 60) - totalBreakTime / 60).toFixed(2),
            status: 'present',
            location: 'Office',
          });
        }
      }
    }
    await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${attendanceRecords.length} attendance records\n`);

    // Create Timesheets
    console.log('📝 Creating timesheets...');
    const timesheets = [];
    for (let i = 0; i < 20; i++) {
      const employee = employees[i % employees.length];
      const project = projects[i % projects.length];
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 2));

      timesheets.push({
        userId: employee._id,
        projectId: project._id,
        date: date,
        hoursWorked: 6 + Math.random() * 4,
        taskDescription: `Work on ${['frontend features', 'backend APIs', 'database optimization', 'bug fixes', 'testing', 'documentation'][i % 6]}`,
        status: i % 5 === 0 ? 'pending' : 'approved',
        approvedBy: managerUser._id,
      });
    }
    await Timesheet.insertMany(timesheets);
    console.log(`✅ Created ${timesheets.length} timesheets\n`);

    // Create Assets
    console.log('💻 Creating assets...');
    const assets = await Asset.create([
      {
        assetId: 'ASSET001',
        name: 'MacBook Pro 16"',
        category: 'laptop',
        serialNumber: 'MBP16-2023-001',
        purchaseDate: new Date('2023-01-15'),
        purchasePrice: 2499,
        status: 'assigned',
        assignedTo: employees[0]._id,
        assignedDate: new Date('2023-01-20'),
        condition: 'excellent',
        warrantyExpiry: new Date('2026-01-15'),
      },
      {
        assetId: 'ASSET002',
        name: 'Dell XPS 15',
        category: 'laptop',
        serialNumber: 'XPS15-2023-002',
        purchaseDate: new Date('2023-02-01'),
        purchasePrice: 1899,
        status: 'assigned',
        assignedTo: employees[1]._id,
        assignedDate: new Date('2023-02-05'),
        condition: 'good',
        warrantyExpiry: new Date('2026-02-01'),
      },
      {
        assetId: 'ASSET003',
        name: 'iPhone 14 Pro',
        category: 'mobile',
        serialNumber: 'IP14P-2023-003',
        purchaseDate: new Date('2023-03-10'),
        purchasePrice: 1099,
        status: 'assigned',
        assignedTo: managerUser._id,
        assignedDate: new Date('2023-03-15'),
        condition: 'excellent',
        warrantyExpiry: new Date('2025-03-10'),
      },
      {
        assetId: 'ASSET004',
        name: 'LG UltraWide Monitor 34"',
        category: 'monitor',
        serialNumber: 'LG34-2023-004',
        purchaseDate: new Date('2023-01-20'),
        purchasePrice: 599,
        status: 'available',
        condition: 'good',
        warrantyExpiry: new Date('2026-01-20'),
      },
      {
        assetId: 'ASSET005',
        name: 'Logitech MX Master 3',
        category: 'accessories',
        serialNumber: 'LMX3-2023-005',
        purchaseDate: new Date('2023-02-15'),
        purchasePrice: 99,
        status: 'assigned',
        assignedTo: employees[2]._id,
        assignedDate: new Date('2023-02-20'),
        condition: 'good',
      },
    ]);
    console.log(`✅ Created ${assets.length} assets\n`);

    // Create Expenses
    console.log('💰 Creating expenses...');
    const expenses = await Expense.create([
      {
        expenseId: 'EXP001',
        userId: employees[0]._id,
        category: 'travel',
        amount: 450,
        description: 'Client meeting travel - NYC',
        date: new Date('2024-01-10'),
        status: 'approved',
        approvedBy: managerUser._id,
        approvedAt: new Date('2024-01-12'),
        receiptUrl: 'https://example.com/receipt001.pdf',
      },
      {
        expenseId: 'EXP002',
        userId: employees[1]._id,
        category: 'software',
        amount: 199,
        description: 'Annual JetBrains license',
        date: new Date('2024-01-15'),
        status: 'approved',
        approvedBy: managerUser._id,
        approvedAt: new Date('2024-01-16'),
      },
      {
        expenseId: 'EXP003',
        userId: employees[2]._id,
        category: 'training',
        amount: 299,
        description: 'UX Design Masterclass course',
        date: new Date('2024-01-20'),
        status: 'pending',
      },
      {
        expenseId: 'EXP004',
        userId: managerUser._id,
        category: 'office',
        amount: 85,
        description: 'Office supplies and stationery',
        date: new Date('2024-01-25'),
        status: 'approved',
        approvedBy: adminUser._id,
        approvedAt: new Date('2024-01-26'),
      },
      {
        expenseId: 'EXP005',
        userId: employees[3]._id,
        category: 'marketing',
        amount: 1200,
        description: 'Social media advertising campaign',
        date: new Date('2024-01-28'),
        status: 'rejected',
        rejectedBy: managerUser._id,
        rejectedAt: new Date('2024-01-29'),
        rejectionReason: 'Budget exceeded for this month',
      },
    ]);
    console.log(`✅ Created ${expenses.length} expenses\n`);

    // Create Leave Requests
    console.log('🏖️  Creating leave requests...');
    const leaves = await Leave.create([
      {
        leaveId: 'LEAVE001',
        userId: employees[0]._id,
        leaveType: 'vacation',
        startDate: new Date('2024-02-15'),
        endDate: new Date('2024-02-20'),
        totalDays: 5,
        reason: 'Family vacation',
        status: 'approved',
        approvedBy: managerUser._id,
        approvedAt: new Date('2024-01-10'),
      },
      {
        leaveId: 'LEAVE002',
        userId: employees[1]._id,
        leaveType: 'sick',
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-01-09'),
        totalDays: 2,
        reason: 'Flu and fever',
        status: 'approved',
        approvedBy: managerUser._id,
        approvedAt: new Date('2024-01-08'),
      },
      {
        leaveId: 'LEAVE003',
        userId: employees[2]._id,
        leaveType: 'personal',
        startDate: new Date('2024-02-05'),
        endDate: new Date('2024-02-05'),
        totalDays: 1,
        reason: 'Personal work',
        status: 'pending',
      },
      {
        leaveId: 'LEAVE004',
        userId: employees[3]._id,
        leaveType: 'vacation',
        startDate: new Date('2024-03-10'),
        endDate: new Date('2024-03-15'),
        totalDays: 5,
        reason: 'Wedding attendance',
        status: 'rejected',
        rejectedBy: managerUser._id,
        rejectedAt: new Date('2024-01-25'),
        rejectionReason: 'Project deadline conflict',
      },
    ]);
    console.log(`✅ Created ${leaves.length} leave requests\n`);

    // Create Announcements
    console.log('📢 Creating announcements...');
    const announcements = await Announcement.create([
      {
        title: 'Welcome to Nexus Ecom Management System! 🎉',
        content: 'We are excited to introduce our new internal management system. This platform will streamline all our HR, project management, and administrative processes. Please explore the features and reach out if you have any questions.',
        category: 'general',
        priority: 'high',
        createdBy: adminUser._id,
        isActive: true,
        expiryDate: new Date('2024-12-31'),
        readBy: [managerUser._id, employees[0]._id],
      },
      {
        title: 'Q1 2024 Company Goals',
        content: 'Our focus for Q1 includes: 1) Complete E-Commerce Platform Redesign, 2) Launch Mobile App Beta, 3) Improve team collaboration, 4) Enhance customer satisfaction scores by 20%.',
        category: 'company',
        priority: 'high',
        createdBy: managerUser._id,
        isActive: true,
      },
      {
        title: 'New Holiday Policy Update',
        content: 'Starting this year, employees will receive an additional 2 floating holidays that can be used at your discretion. Please coordinate with your manager when planning to use these days.',
        category: 'policy',
        priority: 'normal',
        createdBy: adminUser._id,
        isActive: true,
      },
      {
        title: 'Team Building Event - Feb 20',
        content: 'Join us for our quarterly team building event on February 20th at Central Park. Activities include team games, lunch, and networking. RSVP required.',
        category: 'event',
        priority: 'normal',
        createdBy: employees[4]._id, // HR coordinator
        isActive: true,
        expiryDate: new Date('2024-02-20'),
      },
      {
        title: 'IT Maintenance Window',
        content: 'Scheduled maintenance on Saturday, Feb 10 from 2 AM to 6 AM. All systems will be temporarily unavailable. Please save your work before this time.',
        category: 'maintenance',
        priority: 'urgent',
        createdBy: adminUser._id,
        isActive: true,
        expiryDate: new Date('2024-02-10'),
      },
    ]);
    console.log(`✅ Created ${announcements.length} announcements\n`);

    // Create Knowledge Base Articles
    console.log('📚 Creating knowledge base articles...');
    const knowledgeArticles = await KnowledgeBase.create([
      {
        title: 'How to Submit a Timesheet',
        category: 'HR',
        content: 'Step 1: Navigate to Timesheets section\nStep 2: Click "Add New Timesheet"\nStep 3: Select project and date\nStep 4: Enter hours worked and task description\nStep 5: Submit for approval',
        tags: ['timesheet', 'hr', 'tutorial'],
        status: 'published',
        createdBy: adminUser._id,
      },
      {
        title: 'Expense Reimbursement Policy',
        category: 'Finance',
        content: 'All business expenses must be submitted within 30 days of incurrence. Required documents: Original receipt, expense form, manager approval. Processing time: 7-10 business days.',
        tags: ['expense', 'finance', 'policy'],
        status: 'published',
        createdBy: adminUser._id,
      },
      {
        title: 'Remote Work Guidelines',
        category: 'Policy',
        content: 'Employees can work remotely up to 2 days per week. Requirements: Stable internet connection, available during core hours (10 AM - 4 PM), responsive on team communication channels.',
        tags: ['remote', 'policy', 'wfh'],
        status: 'published',
        createdBy: managerUser._id,
      },
      {
        title: 'Project Onboarding Checklist',
        category: 'Projects',
        content: '☑ Access to project repository\n☑ Added to project communication channels\n☑ Project documentation reviewed\n☑ Initial meeting with project manager\n☑ Development environment setup',
        tags: ['project', 'onboarding', 'checklist'],
        status: 'published',
        createdBy: managerUser._id,
      },
    ]);
    console.log(`✅ Created ${knowledgeArticles.length} knowledge base articles\n`);

    console.log('🎉 Demo data seeding completed successfully!\n');
    console.log('═══════════════════════════════════════════');
    console.log('📋 DEMO CREDENTIALS FOR CLIENT');
    console.log('═══════════════════════════════════════════\n');
    console.log('👨‍💼 ADMIN ACCOUNT');
    console.log('   Email: admin@nexusecom.com');
    console.log('   Password: Admin@123');
    console.log('   Access: Full system administration\n');
    console.log('👨‍💼 MANAGER ACCOUNT');
    console.log('   Email: manager@nexusecom.com');
    console.log('   Password: Manager@123');
    console.log('   Access: Team management, approvals\n');
    console.log('👤 EMPLOYEE ACCOUNT');
    console.log('   Email: sarah@nexusecom.com');
    console.log('   Password: Employee@123');
    console.log('   Access: Standard employee features\n');
    console.log('═══════════════════════════════════════════');
    console.log(`\n📊 Data Summary:`);
    console.log(`   Users: ${allUsers.length}`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Attendance Records: ${attendanceRecords.length}`);
    console.log(`   Timesheets: ${timesheets.length}`);
    console.log(`   Assets: ${assets.length}`);
    console.log(`   Expenses: ${expenses.length}`);
    console.log(`   Leave Requests: ${leaves.length}`);
    console.log(`   Announcements: ${announcements.length}`);
    console.log(`   Knowledge Articles: ${knowledgeArticles.length}\n`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await seedDemoData();
    console.log('✅ All done! Closing database connection...');
    await mongoose.connection.close();
    console.log('👋 Database connection closed. Goodbye!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

main();
