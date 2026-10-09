import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Setting from './models/Setting';

dotenv.config();

const updateShopName = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) process.exit(1);

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas...');

    const result = await Setting.updateMany({}, { shopName: 'Miracle Laundry' });
    console.log(`Updated ${result.modifiedCount} settings documents with shopName = 'Miracle Laundry'`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('Error updating shopName:', err.message);
    process.exit(1);
  }
};

updateShopName();
