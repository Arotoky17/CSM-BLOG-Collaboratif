const mongoose = require('mongoose');
const uri = 'mongodb://admin:secret123@localhost:27017/cms_blog?authSource=admin';

console.log('Connecting to MongoDB...');
mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
