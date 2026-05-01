import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:secret123@localhost:27017/cms_blog?authSource=admin';

async function manageUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('cms_blog');
    const usersCollection = db.collection('users');
    
    // Display all admin accounts
    const adminUsers = await usersCollection.find({ role: 'admin' }).project({ password: 0 }).toArray();
    console.log('\n🔐 Admin Accounts:');
    console.log('==================');
    if (adminUsers.length === 0) {
      console.log('No admin users found.');
    } else {
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user._id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log('');
      });
    }
    
    // Count non-admin users
    const nonAdminCount = await usersCollection.countDocuments({ role: { $ne: 'admin' } });
    console.log(`\n📊 Non-admin users to delete: ${nonAdminCount}`);
    
    if (nonAdminCount > 0) {
      // Display non-admin users before deletion
      const nonAdminUsers = await usersCollection.find({ role: { $ne: 'admin' } }).project({ password: 0 }).toArray();
      console.log('\n⚠️  Non-admin users that will be deleted:');
      nonAdminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
      });
      
      // Delete all non-admin users
      const result = await usersCollection.deleteMany({ role: { $ne: 'admin' } });
      console.log(`\n✅ Deleted ${result.deletedCount} non-admin user(s).`);
    } else {
      console.log('\n✅ No non-admin users to delete.');
    }
    
    // Final count
    const remainingUsers = await usersCollection.countDocuments();
    console.log(`\n📈 Total users remaining in database: ${remainingUsers}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔒 Connection closed.');
  }
}

manageUsers();
