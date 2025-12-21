import 'dotenv/config';
import mongoose from 'mongoose';
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow_dev';
const key = process.argv[2];
if (!key) {
  console.error('Usage: node checkLicence.mjs <KEY>');
  process.exit(1);
}
async function run() {
  await mongoose.connect(uri, {});
  const col = mongoose.connection.collection('licencekeys');
  console.log(await col.findOne({ key: key.toUpperCase() }));
  await mongoose.disconnect();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
