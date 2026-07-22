require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Staff = require('../models/Staff');
const MasterData = require('../models/MasterData');
const TrainingRecord = require('../models/TrainingRecord');
const UploadBatch = require('../models/UploadBatch');
const AuditLog = require('../models/AuditLog');

const { ROLES, EMPLOYMENT_STATUS, MASTER_DATA_TYPES, TRAINING_MODES } = require('../config/constants');

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

    // 2. Create Super Admin & Admin Users
    console.log('Seeding Users...');
    const salt = await bcrypt.genSalt(12);
    const defaultPasswordHash = await bcrypt.hash('Admin@1234', salt);

    const superAdminEmail = 'superadmin@tms.com';
    let superAdmin = await User.findOne({ $or: [{ email: superAdminEmail }, { staffNumber: 'S00001' }] });

    if (!superAdmin) {
      superAdmin = new User({
        staffNumber: 'S00001',
        name: 'Super Admin',
        email: superAdminEmail,
        passwordHash: defaultPasswordHash,
        role: ROLES.SUPER_ADMIN,
        isActive: true,
        isDeleted: false
      });
      await superAdmin.save();
    } else {
      superAdmin.email = superAdminEmail;
      await superAdmin.save();
    }

    // Additional Admin User
    let regularAdmin = await User.findOne({ email: 'admin@tms.com' });
    if (!regularAdmin) {
      regularAdmin = new User({
        staffNumber: 'S00002',
        name: 'System Admin',
        email: 'admin@tms.com',
        passwordHash: defaultPasswordHash,
        role: ROLES.ADMIN,
        isActive: true,
        isDeleted: false
      });
      await regularAdmin.save();
    }

    console.log('Users seeded successfully.');

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

    // 4. Seed Staff Members
    console.log('Seeding Staff Directory...');
    const mockStaffData = [
      { staffNumber: 'S00001', staffName: 'Super Admin', emailId: 'superadmin@tms.com', designation: 'General Manager', groupName: 'Engineering', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'Board of Directors', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2020-01-01') },
      { staffNumber: 'S10001', staffName: 'Alice Cooper', emailId: 'alice.cooper@tms.com', designation: 'Senior Software Engineer', groupName: 'Engineering', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'Super Admin', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2021-03-15') },
      { staffNumber: 'S10002', staffName: 'Bob Martin', emailId: 'bob.martin@tms.com', designation: 'Software Engineer', groupName: 'R&D', productDivisionCategory: 'Cloud Solutions', reportingGLManagerName: 'Grace Hopper', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2022-06-01') },
      { staffNumber: 'S10003', staffName: 'Carol White', emailId: 'carol.white@tms.com', designation: 'Manager', groupName: 'Human Resources', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'Super Admin', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2019-11-10') },
      { staffNumber: 'S10004', staffName: 'David Miller', emailId: 'david.miller@tms.com', designation: 'Director', groupName: 'Finance', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'Board of Directors', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2018-04-20') },
      { staffNumber: 'S10005', staffName: 'Eva Green', emailId: 'eva.green@tms.com', designation: 'Senior Software Engineer', groupName: 'Engineering', productDivisionCategory: 'Cloud Solutions', reportingGLManagerName: 'Olivia Wilde', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2022-01-10') },
      { staffNumber: 'S10006', staffName: 'Frank Wright', emailId: 'frank.wright@tms.com', designation: 'Software Engineer', groupName: 'Cloud Solutions', productDivisionCategory: 'Cloud Solutions', reportingGLManagerName: 'Leo Vance', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2023-02-14') },
      { staffNumber: 'S10007', staffName: 'Grace Hopper', emailId: 'grace.hopper@tms.com', designation: 'Manager', groupName: 'R&D', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'Super Admin', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2020-08-05') },
      { staffNumber: 'S10008', staffName: 'Hank Pym', emailId: 'hank.pym@tms.com', designation: 'Director', groupName: 'Sales', productDivisionCategory: 'Consumer Products', reportingGLManagerName: 'Nathan Drake', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2017-09-01') },
      { staffNumber: 'S10009', staffName: 'Iris West', emailId: 'iris.west@tms.com', designation: 'Software Engineer', groupName: 'Engineering', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'Alice Cooper', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2023-07-19') },
      { staffNumber: 'S10010', staffName: 'Jack Ryan', emailId: 'jack.ryan@tms.com', designation: 'Senior Software Engineer', groupName: 'Finance', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'David Miller', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2021-12-01') },
      { staffNumber: 'S10011', staffName: 'Karen Page', emailId: 'karen.page@tms.com', designation: 'Manager', groupName: 'Human Resources', productDivisionCategory: 'Consumer Products', reportingGLManagerName: 'Carol White', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2021-05-11') },
      { staffNumber: 'S10012', staffName: 'Leo Vance', emailId: 'leo.vance@tms.com', designation: 'Software Engineer', groupName: 'Cloud Solutions', productDivisionCategory: 'Cloud Solutions', reportingGLManagerName: 'Grace Hopper', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2022-09-15') },
      { staffNumber: 'S10013', staffName: 'Mia Thermopolis', emailId: 'mia.t@tms.com', designation: 'Senior Software Engineer', groupName: 'R&D', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'Grace Hopper', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2020-11-23') },
      { staffNumber: 'S10014', staffName: 'Nathan Drake', emailId: 'nathan.drake@tms.com', designation: 'Director', groupName: 'Sales', productDivisionCategory: 'Consumer Products', reportingGLManagerName: 'Board of Directors', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2016-02-18') },
      { staffNumber: 'S10015', staffName: 'Olivia Wilde', emailId: 'olivia.wilde@tms.com', designation: 'Manager', groupName: 'Engineering', productDivisionCategory: 'Enterprise Software', reportingGLManagerName: 'Super Admin', employmentStatus: EMPLOYMENT_STATUS.CURRENTLY_SERVING, dateOfJoining: new Date('2019-03-30') }
    ];

    const savedStaffMap = new Map();
    for (const staffItem of mockStaffData) {
      let existing = await Staff.findOne({ staffNumber: staffItem.staffNumber });
      if (!existing) {
        existing = new Staff({
          ...staffItem,
          createdBy: superAdmin._id
        });
        await existing.save();
      } else {
        existing.emailId = staffItem.emailId;
        await existing.save();
      }
      savedStaffMap.set(staffItem.staffNumber, existing);
    }
    console.log(`Seeded ${mockStaffData.length} staff members.`);

    // 5. Seed Training Records
    console.log('Seeding Training Records...');
    const mockTrainingRecords = [
      {
        staffNumber: 'S10001',
        trainingTopic: 'React & Tailwind Modern UI Architecture',
        trainingModuleNumber: 'MOD-UI-101',
        trainerName: 'Sarah Jenkins',
        trainingInstituteName: 'TMS Tech Academy',
        typeOfTraining: 'OT',
        trainingMode: 'Online',
        trainingDurationHours: 16,
        startDateOfTraining: new Date('2026-01-10'),
        endDateOfTraining: new Date('2026-01-14'),
        requestProcessedDate: new Date('2026-01-08'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 4500,
        remarks: 'Successfully cleared final assessment.'
      },
      {
        staffNumber: 'S10002',
        trainingTopic: 'Node.js Microservices & Event Architecture',
        trainingModuleNumber: 'MOD-BE-202',
        trainerName: 'Alex Rivera',
        trainingInstituteName: 'Cloud Native Institute',
        typeOfTraining: 'ILT',
        trainingMode: 'Online',
        trainingDurationHours: 24,
        startDateOfTraining: new Date('2026-02-01'),
        endDateOfTraining: new Date('2026-02-05'),
        requestProcessedDate: new Date('2026-01-25'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 7500,
        remarks: 'High performance in hands-on lab.'
      },
      {
        staffNumber: 'S10003',
        trainingTopic: 'Strategic HR Leadership & Organization Scaling',
        trainingModuleNumber: 'MOD-HR-301',
        trainerName: 'Dr. Robert Vance',
        trainingInstituteName: 'Global Leadership Forum',
        typeOfTraining: 'Group specific',
        trainingMode: 'Offline',
        trainingDurationHours: 12,
        startDateOfTraining: new Date('2026-02-15'),
        endDateOfTraining: new Date('2026-02-17'),
        requestProcessedDate: new Date('2026-02-10'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 9000,
        remarks: 'Executive workshop completed.'
      },
      {
        staffNumber: 'S10004',
        trainingTopic: 'Corporate Financial Compliance & Risk Management',
        trainingModuleNumber: 'MOD-FIN-401',
        trainerName: 'David Sterling',
        trainingInstituteName: 'Financial Risk Academy',
        typeOfTraining: 'ILT',
        trainingMode: 'Offline',
        trainingDurationHours: 30,
        startDateOfTraining: new Date('2026-03-01'),
        endDateOfTraining: new Date('2026-03-06'),
        requestProcessedDate: new Date('2026-02-20'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 12500,
        remarks: 'Certified in quarterly risk reporting.'
      },
      {
        staffNumber: 'S10005',
        trainingTopic: 'MongoDB Optimization & Sharding Mastery',
        trainingModuleNumber: 'MOD-DB-501',
        trainerName: 'Marcus Cole',
        trainingInstituteName: 'Database Pros Academy',
        typeOfTraining: 'OT',
        trainingMode: 'Online',
        trainingDurationHours: 20,
        startDateOfTraining: new Date('2026-03-10'),
        endDateOfTraining: new Date('2026-03-14'),
        requestProcessedDate: new Date('2026-03-05'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 6000,
        remarks: 'Passed index optimization module.'
      },
      {
        staffNumber: 'S10006',
        trainingTopic: 'AWS Cloud DevOps & Infrastructure as Code',
        trainingModuleNumber: 'MOD-CLD-601',
        trainerName: 'Elena Rostova',
        trainingInstituteName: 'AWS Training Partner',
        typeOfTraining: 'Blended',
        trainingMode: 'Online',
        trainingDurationHours: 32,
        startDateOfTraining: new Date('2026-04-05'),
        endDateOfTraining: new Date('2026-04-12'),
        requestProcessedDate: new Date('2026-04-01'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 11000,
        remarks: 'Constructed automated Terraform pipeline.'
      },
      {
        staffNumber: 'S10007',
        trainingTopic: 'Generative AI & LLM Integration for Enterprise',
        trainingModuleNumber: 'MOD-AI-701',
        trainerName: 'Prof. Alan Turing Jr.',
        trainingInstituteName: 'AI Research Institute',
        typeOfTraining: 'Group specific',
        trainingMode: 'Online',
        trainingDurationHours: 40,
        startDateOfTraining: new Date('2026-04-15'),
        endDateOfTraining: new Date('2026-04-22'),
        requestProcessedDate: new Date('2026-04-10'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 15000,
        remarks: 'Built enterprise RAG prototype.'
      },
      {
        staffNumber: 'S10008',
        trainingTopic: 'Enterprise B2B Consultative Sales Workshop',
        trainingModuleNumber: 'MOD-SAL-801',
        trainerName: 'Jordan Belfort Sr.',
        trainingInstituteName: 'Peak Sales Academy',
        typeOfTraining: 'ILT',
        trainingMode: 'Offline',
        trainingDurationHours: 16,
        startDateOfTraining: new Date('2026-05-02'),
        endDateOfTraining: new Date('2026-05-04'),
        requestProcessedDate: new Date('2026-04-25'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 8500,
        remarks: 'Negotiation masterclass completed.'
      },
      {
        staffNumber: 'S10009',
        trainingTopic: 'TypeScript & React State Management Patterns',
        trainingModuleNumber: 'MOD-FE-901',
        trainerName: 'Dan Abramov Open',
        trainingInstituteName: 'TMS Tech Academy',
        typeOfTraining: 'OT',
        trainingMode: 'Online',
        trainingDurationHours: 14,
        startDateOfTraining: new Date('2026-05-12'),
        endDateOfTraining: new Date('2026-05-15'),
        requestProcessedDate: new Date('2026-05-08'),
        trainingStatus: 'In Progress',
        trainingCostPerPerson: 3500,
        remarks: 'Currently attending interactive lectures.'
      },
      {
        staffNumber: 'S10010',
        trainingTopic: 'Advanced Financial Data Modeling with Excel & Python',
        trainingModuleNumber: 'MOD-FIN-902',
        trainerName: 'Claire Redfield',
        trainingInstituteName: 'Analytics Guild',
        typeOfTraining: 'Blended',
        trainingMode: 'Online',
        trainingDurationHours: 25,
        startDateOfTraining: new Date('2026-06-01'),
        endDateOfTraining: new Date('2026-06-07'),
        requestProcessedDate: new Date('2026-05-28'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 7000,
        remarks: 'Built financial forecasting scripts.'
      },
      {
        staffNumber: 'S10011',
        trainingTopic: 'Workplace Inclusion & Performance Evaluation',
        trainingModuleNumber: 'MOD-HR-903',
        trainerName: 'Amanda Waller',
        trainingInstituteName: 'HR Excellence Center',
        typeOfTraining: 'ILT',
        trainingMode: 'Offline',
        trainingDurationHours: 10,
        startDateOfTraining: new Date('2026-06-15'),
        endDateOfTraining: new Date('2026-06-16'),
        requestProcessedDate: new Date('2026-06-10'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 4000,
        remarks: 'Certified facilitator status achieved.'
      },
      {
        staffNumber: 'S10012',
        trainingTopic: 'Kubernetes Container Orchestration & Helm',
        trainingModuleNumber: 'MOD-K8S-904',
        trainerName: 'Viktor Krum',
        trainingInstituteName: 'Cloud Native Institute',
        typeOfTraining: 'OT',
        trainingMode: 'Online',
        trainingDurationHours: 35,
        startDateOfTraining: new Date('2026-07-01'),
        endDateOfTraining: new Date('2026-07-08'),
        requestProcessedDate: new Date('2026-06-25'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 12000,
        remarks: 'CKAD preparation module completed.'
      },
      {
        staffNumber: 'S10013',
        trainingTopic: 'Zero Trust Cybersecurity Fundamentals',
        trainingModuleNumber: 'MOD-SEC-905',
        trainerName: 'Bruce Wayne',
        trainingInstituteName: 'Gotham Cyber Institute',
        typeOfTraining: 'Group specific',
        trainingMode: 'Online',
        trainingDurationHours: 18,
        startDateOfTraining: new Date('2026-07-10'),
        endDateOfTraining: new Date('2026-07-13'),
        requestProcessedDate: new Date('2026-07-05'),
        trainingStatus: 'Scheduled',
        trainingCostPerPerson: 5500,
        remarks: 'Registration confirmed.'
      },
      {
        staffNumber: 'S10014',
        trainingTopic: 'Global Key Account Management & CRM Strategy',
        trainingModuleNumber: 'MOD-SAL-906',
        trainerName: 'Harvey Specter',
        trainingInstituteName: 'Pearson Hardman Training',
        typeOfTraining: 'ILT',
        trainingMode: 'Offline',
        trainingDurationHours: 24,
        startDateOfTraining: new Date('2026-07-15'),
        endDateOfTraining: new Date('2026-07-18'),
        requestProcessedDate: new Date('2026-07-10'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 10000,
        remarks: 'Top score in case study presentation.'
      },
      {
        staffNumber: 'S10015',
        trainingTopic: 'Agile Coaching & Scrum Master Certification',
        trainingModuleNumber: 'MOD-AGL-907',
        trainerName: 'Jeff Sutherland Jr.',
        trainingInstituteName: 'Scrum Alliance',
        typeOfTraining: 'Blended',
        trainingMode: 'Online',
        trainingDurationHours: 16,
        startDateOfTraining: new Date('2026-07-19'),
        endDateOfTraining: new Date('2026-07-21'),
        requestProcessedDate: new Date('2026-07-15'),
        trainingStatus: 'Completed',
        trainingCostPerPerson: 6500,
        remarks: 'CSM exam passed with distinction.'
      }
    ];

    for (const record of mockTrainingRecords) {
      const staffMember = savedStaffMap.get(record.staffNumber);
      if (!staffMember) continue;

      const exists = await TrainingRecord.findOne({
        staffNumber: record.staffNumber,
        trainingModuleNumber: record.trainingModuleNumber,
        startDateOfTraining: record.startDateOfTraining
      });

      if (!exists) {
        const doc = new TrainingRecord({
          // Staff Snapshot
          staffNumber: staffMember.staffNumber,
          staffName: staffMember.staffName,
          emailId: staffMember.emailId,
          designation: staffMember.designation,
          groupName: staffMember.groupName,
          productDivisionCategory: staffMember.productDivisionCategory,
          reportingGLManagerName: staffMember.reportingGLManagerName,
          employmentStatus: staffMember.employmentStatus,
          dateOfJoining: staffMember.dateOfJoining,
          superannuationDate: staffMember.superannuationDate,

          // Training Details
          trainingTopic: record.trainingTopic,
          trainingModuleNumber: record.trainingModuleNumber,
          trainerName: record.trainerName,
          trainingInstituteName: record.trainingInstituteName,
          typeOfTraining: record.typeOfTraining,
          trainingMode: record.trainingMode,
          trainingDurationHours: record.trainingDurationHours,
          startDateOfTraining: record.startDateOfTraining,
          endDateOfTraining: record.endDateOfTraining,
          requestProcessedDate: record.requestProcessedDate,
          trainingStatus: record.trainingStatus,
          trainingCostPerPerson: record.trainingCostPerPerson,
          remarks: record.remarks,

          createdBy: superAdmin._id
        });
        await doc.save();
      }
    }
    console.log(`Seeded ${mockTrainingRecords.length} training records.`);

    // 6. Seed Audit Logs
    console.log('Seeding initial Audit Logs...');
    const auditEntries = [
      { action: 'LOGIN', module: 'Auth', details: 'Super Admin logged in from web portal' },
      { action: 'BULK_UPLOAD', module: 'Upload', details: 'Imported Master Staff list batch #101' },
      { action: 'CREATE', module: 'Training', details: 'Added course log: React & Tailwind Modern UI Architecture' },
      { action: 'CREATE', module: 'Training', details: 'Added course log: Node.js Microservices Architecture' },
      { action: 'EXPORT', module: 'Report', details: 'Downloaded Financial Year summary PDF report' }
    ];

    for (const audit of auditEntries) {
      const log = new AuditLog({
        userId: superAdmin._id,
        userEmail: superAdmin.email,
        action: audit.action,
        module: audit.module,
        recordId: superAdmin._id,
        before: null,
        after: { message: audit.details },
        ipAddress: '127.0.0.1'
      });
      await log.save();
    }
    console.log('Audit Logs seeded.');

    console.log('🎉 All mock data seeding actions complete!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
