import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from './models/Order';

dotenv.config();

const fixOrderNumber = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/miraclelaundry';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const result = await Order.updateOne(
      { orderNumber: 'ORD-412/26' },
      { $set: { orderNumber: 'ORD-1/26' } }
    );

    if (result.matchedCount > 0) {
      console.log('Successfully updated order ORD-412/26 to ORD-1/26!');
    } else {
      const order = await Order.findOne({ orderNumber: /412/ });
      if (order) {
        const oldNum = order.orderNumber;
        order.orderNumber = order.orderNumber.replace('412', '1');
        await order.save();
        console.log(`Updated order ${oldNum} to ${order.orderNumber}`);
      } else {
        console.log('No order with 412 found in database.');
      }
    }
  } catch (error) {
    console.error('Error updating order:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

fixOrderNumber();
