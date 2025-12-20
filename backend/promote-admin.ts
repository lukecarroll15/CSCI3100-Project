import mongoose from 'mongoose';
import { UserModel } from './src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address.');
  process.exit(1);
}

async function promote() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow_dev');
    const user = await UserModel.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
    if (user) {
      console.log(`User ${email} is now an admin.`);
    } else {
      console.log(`User ${email} not found.`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

promote();
