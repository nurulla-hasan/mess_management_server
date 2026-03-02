import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env');
  process.exit(1);
}

const clearDatabase = async () => {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const collections = await mongoose.connection.db?.listCollections().toArray();
    
    if (collections && collections.length > 0) {
      console.log(`🗑️ Found ${collections.length} collections. Clearing...`);
      
      for (const collection of collections) {
        await mongoose.connection.db?.dropCollection(collection.name);
        console.log(`✅ Dropped collection: ${collection.name}`);
      }
      
      console.log('✨ All collections dropped successfully!');
    } else {
      console.log('ℹ️ No collections found to clear.');
    }

  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

clearDatabase();
