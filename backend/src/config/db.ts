import mongoose from 'mongoose';

export const connectDB = async (): Promise<boolean> => {
  try {
    let connStr = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/miraclelaundry';
    
    // Auto-fix accidentally pasted backslashes
    if (connStr.includes('mongodb+srv:\\')) {
      connStr = connStr.replace('mongodb+srv:\\', 'mongodb+srv://');
    }
    if (connStr.includes('.net\\')) {
      connStr = connStr.replace('.net\\', '.net/');
    }

    console.log(`[DB] Attempting to connect to MongoDB at: ${connStr.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error: any) {
    console.error(`[DB ERROR] Could not connect to MongoDB Atlas: ${error.message}`);
    console.error(`[DB ERROR] Will retry connecting to MongoDB Atlas in 5 seconds...`);
    setTimeout(connectDB, 5000);
    return false;
  }
};
