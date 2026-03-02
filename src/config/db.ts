import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mess_management');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', (error as Error).message);
  }
};

export default connectDB;
