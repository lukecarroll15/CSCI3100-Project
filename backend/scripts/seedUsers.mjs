import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow_dev';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
  displayName: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  githubId: { type: String, unique: true, sparse: true, index: true },
  githubUsername: { type: String, default: '' },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const employeeNames = [
  { first: 'Sarah', last: 'Chen', admin: true },
  { first: 'Michael', last: 'Rodriguez', admin: false },
  { first: 'Emily', last: 'Thompson', admin: false },
  { first: 'David', last: 'Park', admin: true },
  { first: 'Jessica', last: 'Williams', admin: false },
  { first: 'Kevin', last: 'Zhang', admin: false },
  { first: 'Amanda', last: 'Foster', admin: false },
  { first: 'Ryan', last: 'Patel', admin: false },
  { first: 'Lauren', last: 'Martinez', admin: false },
  { first: 'James', last: 'Kim', admin: false },
  { first: 'Olivia', last: 'Johnson', admin: false },
  { first: 'Daniel', last: 'Lee', admin: true },
  { first: 'Sophia', last: 'Anderson', admin: false },
  { first: 'Marcus', last: 'Brown', admin: false },
  { first: 'Rachel', last: 'Davis', admin: false },
  { first: 'Alex', last: 'Wilson', admin: false },
  { first: 'Jordan', last: 'Taylor', admin: false },
  { first: 'Morgan', last: 'Garcia', admin: false },
  { first: 'Casey', last: 'Moore', admin: true },
  { first: 'Harper', last: 'Jackson', admin: false },
];

function generateUsers() {
  return employeeNames.map((person) => ({
    email: `${person.first.toLowerCase()}.${person.last.toLowerCase()}@taskflow.com`,
    displayName: `${person.first} ${person.last}`,
    role: person.admin ? 'admin' : 'user',
  }));
}

async function seedUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    console.log('Clearing existing users...');
    await User.deleteMany({});
    console.log('Existing users cleared');

    // Generate and insert new users
    const users = generateUsers();
    console.log(`Inserting ${users.length} employee accounts...`);
    await User.insertMany(users);
    console.log(`✅ Successfully seeded ${users.length} users!`);

    // Display summary
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.length - adminCount;
    
    console.log(`\nSummary:`);
    console.log(`  - ${adminCount} admin accounts`);
    console.log(`  - ${userCount} regular user accounts`);
    console.log(`\nAdmin accounts:`);
    users.filter(u => u.role === 'admin').forEach(u => {
      console.log(`  - ${u.displayName} (${u.email})`);
    });

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
