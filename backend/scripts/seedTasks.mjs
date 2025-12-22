import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI =
  process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow_dev';

const taskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    department: {
      type: String,
      enum: ['sales', 'it', 'finance', 'marketing', 'hr', 'customer-service'],
      required: true,
    },
    assignee: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed'],
      default: 'Not Started',
    },
    completedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Task = mongoose.model('Task', taskSchema);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
});

const User = mongoose.model('User', userSchema);

// Sample task templates by department
const taskTemplates = {
  sales: [
    { name: 'Follow up with Q4 leads', desc: 'Contact all leads from November pipeline meeting' },
    {
      name: 'Prepare sales presentation for ABC Corp',
      desc: 'Create deck showcasing our enterprise solutions',
    },
    {
      name: 'Update CRM with client feedback',
      desc: 'Input notes from recent client calls into Salesforce',
    },
    { name: 'Quarterly sales report', desc: 'Compile revenue data and forecasts for Q1' },
    {
      name: 'Client renewal negotiations',
      desc: 'Schedule meetings with clients up for contract renewal',
    },
    { name: 'Product demo for new prospects', desc: 'Prepare and deliver product demonstrations' },
  ],
  it: [
    { name: 'Security audit review', desc: 'Review findings from external security assessment' },
    {
      name: 'Database backup verification',
      desc: 'Confirm all automated backups are running correctly',
    },
    { name: 'Deploy authentication updates', desc: 'Push new OAuth implementation to production' },
    { name: 'Server maintenance window', desc: 'Apply system updates and patches to all servers' },
    {
      name: 'Network infrastructure upgrade',
      desc: 'Plan and execute switch replacement in Building B',
    },
    { name: 'User access audit', desc: 'Review and clean up inactive user accounts' },
  ],
  finance: [
    {
      name: 'Monthly expense reconciliation',
      desc: 'Match credit card statements with expense reports',
    },
    { name: 'Budget forecast for Q2', desc: 'Prepare financial projections for next quarter' },
    {
      name: 'Vendor payment processing',
      desc: 'Process outstanding invoices and approve payments',
    },
    { name: 'Annual audit preparation', desc: 'Gather documentation for external auditors' },
    { name: 'Payroll review', desc: 'Verify payroll calculations and process payments' },
    {
      name: 'Financial report for board meeting',
      desc: 'Create comprehensive financial summary for executives',
    },
  ],
  marketing: [
    { name: 'Social media content calendar', desc: 'Plan and schedule posts for next month' },
    {
      name: 'Launch campaign for new product',
      desc: 'Coordinate email, social, and paid ads for Product X',
    },
    { name: 'Website analytics review', desc: 'Analyze traffic patterns and conversion metrics' },
    { name: 'Update brand guidelines', desc: 'Refresh visual identity standards and templates' },
    {
      name: 'Event planning for trade show',
      desc: 'Organize booth, materials, and staff for industry conference',
    },
    { name: 'Customer testimonial video', desc: 'Film and edit client success story' },
  ],
  hr: [
    { name: 'New hire onboarding sessions', desc: 'Conduct orientation for January starters' },
    {
      name: 'Performance review cycle kickoff',
      desc: 'Launch annual performance evaluation process',
    },
    {
      name: 'Update employee handbook',
      desc: 'Revise policies to reflect new remote work guidelines',
    },
    { name: 'Benefits enrollment period', desc: 'Coordinate open enrollment for health insurance' },
    { name: 'Team building event planning', desc: 'Organize Q1 all-hands gathering' },
    { name: 'Diversity and inclusion training', desc: 'Schedule and facilitate DEI workshops' },
  ],
  'customer-service': [
    { name: 'Ticket backlog review', desc: 'Clear overdue support tickets from system' },
    { name: 'Customer satisfaction survey', desc: 'Send quarterly CSAT survey to all clients' },
    {
      name: 'Knowledge base article updates',
      desc: 'Refresh FAQ and troubleshooting documentation',
    },
    { name: 'Support team training', desc: 'Train staff on new product features' },
    { name: 'Escalation process review', desc: 'Improve workflow for critical customer issues' },
    { name: 'Live chat system upgrade', desc: 'Implement new chat platform with AI assistance' },
  ],
};

const assigneeNames = [
  'Sarah Chen',
  'Michael Rodriguez',
  'Emily Thompson',
  'David Park',
  'Jessica Williams',
  'Kevin Zhang',
  'Amanda Foster',
  'Ryan Patel',
  'Lauren Martinez',
  'James Kim',
  'Olivia Johnson',
  'Daniel Lee',
  'Sophia Anderson',
  'Marcus Brown',
  'Rachel Davis',
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(daysFromNow, range) {
  const date = new Date();
  const offset = daysFromNow + Math.floor(Math.random() * range);
  date.setDate(date.getDate() + offset);
  return date;
}

async function generateTasks(userList) {
  const tasks = [];
  const departments = Object.keys(taskTemplates);
  const priorities = ['high', 'medium', 'low'];
  const statuses = ['Not Started', 'In Progress', 'Completed'];

  // Use real user names from database, filter out empty ones
  const userNames = userList
    .map((u) => u.displayName)
    .filter((name) => name && name.trim().length > 0);

  if (userNames.length === 0) {
    console.warn('No valid user names found, using defaults');
    userNames.push(
      ...['Sarah Chen', 'Michael Rodriguez', 'Emily Thompson', 'David Park', 'Jessica Williams']
    );
  }

  // Generate 25-30 tasks for the next month
  const nearTermCount = 25 + Math.floor(Math.random() * 6); // 25-30 tasks
  for (let i = 0; i < nearTermCount; i++) {
    const department = getRandomElement(departments);
    const template = getRandomElement(taskTemplates[department]);
    const priority = getRandomElement(priorities);
    const assignee = getRandomElement(userNames);
    const dueDate = getRandomDate(1, 30); // 1-30 days from now

    // Weight towards Not Started/In Progress (80%), few Completed (20%)
    let status;
    const rand = Math.random();
    if (rand < 0.5) {
      status = 'Not Started';
    } else if (rand < 0.8) {
      status = 'In Progress';
    } else {
      status = 'Completed';
    }

    const task = {
      name: template.name,
      description: template.desc,
      priority,
      department,
      assignee,
      dueDate,
      status,
      completedAt:
        status === 'Completed'
          ? new Date(dueDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          : undefined,
    };

    tasks.push(task);
  }

  // Generate 8-12 longer-term tasks (3-5 months out)
  const longTermCount = 8 + Math.floor(Math.random() * 5); // 8-12 tasks
  for (let i = 0; i < longTermCount; i++) {
    const department = getRandomElement(departments);
    const template = getRandomElement(taskTemplates[department]);
    const priority = getRandomElement(priorities);
    const assignee = getRandomElement(userNames);
    const dueDate = getRandomDate(90, 60); // 90-150 days from now (3-5 months)

    const task = {
      name: template.name,
      description: template.desc,
      priority,
      department,
      assignee,
      dueDate,
      status: 'Not Started', // Long-term tasks are typically not started yet
    };

    tasks.push(task);
  }

  return tasks;
}

async function seedTasks() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find an admin user to use as createdBy, or create a system user
    console.log('Finding admin user...');
    let adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      console.log('No admin user found. Creating system admin user for seeding...');
      adminUser = await User.create({
        displayName: 'System Admin',
        email: 'system@taskflow.com',
        role: 'admin',
      });
      console.log('System admin user created');
    }

    console.log(`Using admin user: ${adminUser.email}`);

    // Fetch all users from database
    console.log('Fetching employee list...');
    const userList = await User.find({});

    if (userList.length === 0) {
      console.log('No users found. Please run "npm run seed:users" first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`Found ${userList.length} employees`);

    // Clear existing tasks
    console.log('Clearing existing tasks...');
    await Task.deleteMany({});
    console.log('Existing tasks cleared');

    // Generate and insert new tasks
    const tasks = await generateTasks(userList);

    // Add createdBy field to all tasks
    const tasksWithCreator = tasks.map((task) => ({
      ...task,
      createdBy: adminUser._id,
    }));

    console.log(`Inserting ${tasksWithCreator.length} sample tasks...`);
    await Task.insertMany(tasksWithCreator);
    console.log(`✅ Successfully seeded ${tasksWithCreator.length} tasks!`);

    // Display summary
    const nearTerm = tasks.filter((t) => {
      const daysUntil = Math.ceil((t.dueDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 30;
    }).length;
    const longTerm = tasks.length - nearTerm;

    console.log(`\nSummary:`);
    console.log(`  - ${nearTerm} tasks due within the next month`);
    console.log(`  - ${longTerm} tasks due in 3-5 months`);
    console.log(
      `  - Priorities: High (${tasks.filter((t) => t.priority === 'high').length}), Medium (${tasks.filter((t) => t.priority === 'medium').length}), Low (${tasks.filter((t) => t.priority === 'low').length})`
    );
    console.log(`  - Departments: ${[...new Set(tasks.map((t) => t.department))].join(', ')}`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error seeding tasks:', error);
    process.exit(1);
  }
}

seedTasks();
