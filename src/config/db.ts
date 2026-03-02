import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mess_management', {
      bufferCommands: false,
    });
    
    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', (error as Error).message);
    throw error;
  }
};

export default connectDB;
