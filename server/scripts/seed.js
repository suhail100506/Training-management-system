require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Staff = require('../models/Staff');
const MasterData = require('../models/MasterData');
const TrainingRecord = require('../models/TrainingRecord');
const UploadBatch = require('../models/UploadBatch');
const AuditLog = require('../models/AuditLog');

const { ROLES, EMPLOYMENT_STATUS, MASTER_DATA_TYPES } = require('../config/constants');

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // 1. Sync indexes
    console.log('Syncing indexes...');
    await User.syncIndexes();
    await Staff.syncIndexes();
    await TrainingRecord.syncIndexes();
    await MasterData.syncIndexes();
    await UploadBatch.syncIndexes();
    await AuditLog.syncIndexes();
    console.log('Indexes synced.');

    // 2. Create Super Admin User
    console.log('Checking for Super Admin User...');
    const superAdminEmail = 'superadmin@tms.com';
    let superAdmin = await User.findOne({ $or: [{ email: superAdminEmail }, { staffNumber: 'S00001' }] });

    if (!superAdmin) {
      console.log('Creating Super Admin user...');
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash('Admin@1234', salt);

      superAdmin = new User({
        staffNumber: 'S00001',
        name: 'Super Admin',
        email: superAdminEmail,
        passwordHash,
        role: ROLES.SUPER_ADMIN,
        isActive: true,
        isDeleted: false
      });
      await superAdmin.save();
      console.log('Super Admin user created successfully.');
    } else {
      superAdmin.email = superAdminEmail;
      await superAdmin.save();
      console.log('Super Admin user updated successfully.');
    }

    // Also check if Super Admin is in Staff list
    let saStaff = await Staff.findOne({ staffNumber: 'S00001' });
    if (!saStaff) {
      saStaff = new Staff({
        staffNumber: 'S00001',
        staffName: 'Super Admin',
        emailId: superAdminEmail,
        designation: 'General Manager',
        groupName: 'Engineering',
        productDivisionCategory: 'Enterprise Software',
        reportingGLManagerName: 'Board of Directors',
        employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING,
        dateOfJoining: new Date('2020-01-01'),
        createdBy: superAdmin._id
      });
      await saStaff.save();
      console.log('Super Admin added to Staff master list.');
    } else {
      saStaff.emailId = superAdminEmail;
      await saStaff.save();
    }

    // 3. Seed Master Data
    console.log('Seeding Master Data...');
    const masterDataList = [
      // Designations
      { type: MASTER_DATA_TYPES.DESIGNATION, value: 'Software Engineer' },
      { type: MASTER_DATA_TYPES.DESIGNATION, value: 'Senior Software Engineer' },
      { type: MASTER_DATA_TYPES.DESIGNATION, value: 'Manager' },
      { type: MASTER_DATA_TYPES.DESIGNATION, value: 'General Manager' },
      { type: MASTER_DATA_TYPES.DESIGNATION, value: 'Director' },
      
      // Groups
      { type: MASTER_DATA_TYPES.GROUP_NAME, value: 'Engineering' },
      { type: MASTER_DATA_TYPES.GROUP_NAME, value: 'R&D' },
      { type: MASTER_DATA_TYPES.GROUP_NAME, value: 'Human Resources' },
      { type: MASTER_DATA_TYPES.GROUP_NAME, value: 'Sales' },
      { type: MASTER_DATA_TYPES.GROUP_NAME, value: 'Finance' },

      // Product Divisions
      { type: MASTER_DATA_TYPES.PRODUCT_DIVISION, value: 'Enterprise Software' },
      { type: MASTER_DATA_TYPES.PRODUCT_DIVISION, value: 'Cloud Solutions' },
      { type: MASTER_DATA_TYPES.PRODUCT_DIVISION, value: 'Consumer Products' },

      // Departments
      { type: MASTER_DATA_TYPES.DEPARTMENT, value: 'IT' },
      { type: MASTER_DATA_TYPES.DEPARTMENT, value: 'HR' },
      { type: MASTER_DATA_TYPES.DEPARTMENT, value: 'Finance' },

      // Training Types
      { type: MASTER_DATA_TYPES.TYPE_OF_TRAINING, value: 'OT' },
      { type: MASTER_DATA_TYPES.TYPE_OF_TRAINING, value: 'ILT' },
      { type: MASTER_DATA_TYPES.TYPE_OF_TRAINING, value: 'Blended' },
      { type: MASTER_DATA_TYPES.TYPE_OF_TRAINING, value: 'Training for external members' },
      { type: MASTER_DATA_TYPES.TYPE_OF_TRAINING, value: 'Group specific' },
      { type: MASTER_DATA_TYPES.TYPE_OF_TRAINING, value: 'Others' }
    ];

    for (const item of masterDataList) {
      const exists = await MasterData.findOne({ type: item.type, value: item.value });
      if (!exists) {
        const doc = new MasterData({
          type: item.type,
          value: item.value,
          isActive: true,
          createdBy: superAdmin._id
        });
        await doc.save();
      }
    }
    console.log('Master Data seeded.');


    console.log('All seeding actions complete.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
