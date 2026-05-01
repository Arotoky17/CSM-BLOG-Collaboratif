const mongoose = require('mongoose');
const uri = 'mongodb://admin:secret123@localhost:27017/cms_blog?authSource=admin';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function listUsers() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    const users = await User.find({}, 'name email role');
    console.log('--- List of Users ---');
    console.log(JSON.stringify(users, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

listUsers();
