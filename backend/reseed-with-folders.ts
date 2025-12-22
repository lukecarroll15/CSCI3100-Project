
import mongoose from 'mongoose';
import { UserModel } from './src/models/User';
import { FileModel } from './src/models/File';
import FolderModel from './src/models/Folder';
import { DepartmentModel } from './src/models/Department';
import { env } from './src/config/env';

const USERS = [
  { email: 'sarah.chen@example.com', displayName: 'Sarah Chen', role: 'user' },
  { email: 'david.park@example.com', displayName: 'David Park', role: 'admin' },
  { email: 'michael.torres@example.com', displayName: 'Michael Torres', role: 'user' },
  { email: 'emma.wilson@example.com', displayName: 'Emma Wilson', role: 'user' },
  { email: 'john.smith@example.com', displayName: 'John Smith', role: 'user' },
];

const DEPARTMENTS = [
  'Sales', 'IT', 'Finance', 'Marketing', 'HR', 'Customer Service'
];

const FILES = [
  {
    originalName: 'Final_Tender_Submission.pdf',
    mimeType: 'application/pdf',
    size: 2500000, // 2.5MB
    department: 'Sales',
    uploaderEmail: 'sarah.chen@example.com',
    isAdminOnly: false
  },
  {
    originalName: 'Security_Audit_2025.pdf',
    mimeType: 'application/pdf',
    size: 5600000, // 5.6MB
    department: 'IT',
    uploaderEmail: 'david.park@example.com',
    isAdminOnly: true
  },
  {
    originalName: 'Q4_Budget_Draft.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 120000, // 120KB
    department: 'Finance',
    uploaderEmail: 'michael.torres@example.com',
    isAdminOnly: false
  },
  {
    originalName: 'Marketing_Assets_Q4.zip',
    mimeType: 'application/zip',
    size: 15400000, // 15.4MB
    department: 'Marketing',
    uploaderEmail: 'emma.wilson@example.com',
    isAdminOnly: false
  },
  {
    originalName: 'Client_Feedback_Summary.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 45000, // 45KB
    department: 'Customer Service',
    uploaderEmail: 'john.smith@example.com',
    isAdminOnly: false
  },
  {
    originalName: 'Team_Building_Event_Plan.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 28000, // 28KB
    department: 'HR',
    uploaderEmail: 'sarah.chen@example.com',
    isAdminOnly: false
  },
  {
    originalName: 'Deployment_Script_v2.sh',
    mimeType: 'text/x-sh',
    size: 5000, // 5KB
    department: 'IT',
    uploaderEmail: 'david.park@example.com',
    isAdminOnly: true
  },
  {
    originalName: 'Client_Presentation_Draft.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: 8900000, // 8.9MB
    department: 'Sales',
    uploaderEmail: 'emma.wilson@example.com',
    isAdminOnly: false
  },
  {
    originalName: 'Sales_Strategy_2025.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 890000, // 890KB
    department: 'Sales',
    uploaderEmail: 'emma.wilson@example.com',
    isAdminOnly: true
  },
  {
    originalName: 'Employee_Schedule.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 456000, // 456KB
    department: 'HR',
    uploaderEmail: 'john.smith@example.com',
    isAdminOnly: false
  }
];

async function reseedWithFolders() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Clean up existing Files and Folders
    console.log('Deleting all existing Files and Folders...');
    await FileModel.deleteMany({});
    await FolderModel.deleteMany({});
    console.log('Cleanup complete.');

    // 2. Ensure Users exist (and get their IDs)
    console.log('Ensuring Users exist...');
    const userMap = new Map<string, string>(); // email -> _id
    
    for (const u of USERS) {
      const user = await UserModel.findOneAndUpdate(
        { email: u.email },
        { 
          email: u.email, 
          displayName: u.displayName, 
          role: u.role 
        },
        { upsert: true, new: true }
      );
      userMap.set(u.email, user._id.toString());
    }

    // Get an admin ID for creating the department folders
    const adminId = userMap.get('david.park@example.com');
    if (!adminId) throw new Error('Admin user not found for folder creation');

    // 3. Create Department Folders
    console.log('Creating Department Folders...');
    const folderMap = new Map<string, string>(); // departmentName -> folderId

    for (const deptName of DEPARTMENTS) {
      // Ensure Department document exists
      await DepartmentModel.findOneAndUpdate(
        { name: deptName },
        { name: deptName },
        { upsert: true, new: true }
      );

      // Create Folder for Department
      const folder = await FolderModel.create({
        name: deptName,
        parentFolder: null,
        createdBy: adminId,
        department: deptName
      });
      folderMap.set(deptName, folder._id.toString());
      console.log(`Created folder: ${deptName}`);
    }

    // 4. Seed Files into their respective Folders
    console.log('Seeding Files into Folders...');
    for (const f of FILES) {
      const uploaderId = userMap.get(f.uploaderEmail);
      if (!uploaderId) {
        console.warn(`Uploader not found for ${f.originalName}: ${f.uploaderEmail}`);
        continue;
      }

      const folderId = folderMap.get(f.department);
      if (!folderId) {
        console.warn(`Folder not found for department: ${f.department}`);
        continue;
      }

      await FileModel.create({
        originalName: f.originalName,
        storedName: `dummy-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        mimeType: f.mimeType,
        size: f.size,
        uploadedBy: uploaderId,
        department: f.department,
        folder: folderId, // Place in the department folder
        isAdminOnly: f.isAdminOnly
      });
      console.log(`Created file: ${f.originalName} in folder ${f.department}`);
    }

    console.log('Reseeding complete!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Reseeding error:', error);
    process.exit(1);
  }
}

reseedWithFolders();
