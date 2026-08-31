import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import Admin from './models/Admin';
import Shop from './models/Shop';
import Service from './models/Service';
import LaundryItem from './models/LaundryItem';
import Setting from './models/Setting';
import Order from './models/Order';
import Customer from './models/Customer';
import Expense from './models/Expense';
import Staff from './models/Staff';
import MachineLog from './models/MachineLog';
import Payment from './models/Payment';

dotenv.config();

export const seedDatabase = async () => {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.log('[SEED] Skipping seed because MongoDB database is not connected.');
    return;
  }

  try {
    console.log('[SEED] Starting database seeding process...');

    // 1. Seed or Retrieve Default Main Shop/Branch
    let mainShop = await Shop.findOne({ code: 'MAIN-01' });
    if (!mainShop) {
      // Check if existing Setting has shop details
      const existingSetting = await Setting.findOne();
      mainShop = await Shop.create({
        name: existingSetting?.shopName || 'Miracle Laundry - Main Branch',
        code: 'MAIN-01',
        region: 'Central Zone',
        phone: existingSetting?.phone || '+91 98765 43210',
        email: existingSetting?.email || 'contact@miraclelaundry.com',
        address: existingSetting?.address || '123 Sparkle Avenue, Suite 4B, Commercial Hub',
        invoicePrefix: existingSetting?.invoicePrefix || 'ORD-',
        gstNumber: existingSetting?.gstNumber || '22AAAAA0000A1Z5',
        gstPercentage: existingSetting?.gstPercentage || 0,
        currencySymbol: existingSetting?.currencySymbol || '₹',
        currencyCode: existingSetting?.currencyCode || 'INR',
        upiId: existingSetting?.upiId || '',
        gpayNumber: existingSetting?.gpayNumber || '',
        paymentQrUrl: existingSetting?.paymentQrUrl || '',
        logoUrl: existingSetting?.logoUrl || '/logo.jpg',
        termsAndConditions: existingSetting?.termsAndConditions || '1. Clothes not collected within 30 days are subject to storage charges.',
        isActive: true,
      });
      console.log('[SEED] Default Main Branch created (code: MAIN-01)');
    }

    // 2. Seed Super Admin
    let admin = await Admin.findOne({ username: 'adminIL' });
    if (!admin) {
      await Admin.deleteMany({ username: 'admin' });
      const hashedPassword = await bcrypt.hash('IL@112', 10);
      await Admin.create({
        username: 'adminIL',
        password: hashedPassword,
        name: 'Master Business Owner',
        email: 'owner@intelligentlaundry.com',
        role: 'super_admin',
        isActive: true,
      });
      console.log('[SEED] Super Admin created (username: adminIL, password: IL@112, role: super_admin)');
    } else {
      if (admin.role !== 'super_admin') {
        admin.role = 'super_admin';
        await admin.save();
      }
    }

    // 3. Migrate any unassociated records to the Main Branch
    if (mainShop) {
      const mainShopId = mainShop._id;
      await Promise.all([
        Order.updateMany({ $or: [{ shopId: null }, { shopId: { $exists: false } }] }, { $set: { shopId: mainShopId } }),
        Customer.updateMany({ $or: [{ shopId: null }, { shopId: { $exists: false } }] }, { $set: { shopId: mainShopId } }),
        Expense.updateMany({ $or: [{ shopId: null }, { shopId: { $exists: false } }] }, { $set: { shopId: mainShopId } }),
        Staff.updateMany({ $or: [{ shopId: null }, { shopId: { $exists: false } }] }, { $set: { shopId: mainShopId } }),
        MachineLog.updateMany({ $or: [{ shopId: null }, { shopId: { $exists: false } }] }, { $set: { shopId: mainShopId } }),
        Payment.updateMany({ $or: [{ shopId: null }, { shopId: { $exists: false } }] }, { $set: { shopId: mainShopId } }),
      ]);
    }

    // 4. Seed Settings if missing or update branding
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({
        shopName: 'Miracle Laundry',
        shopTagline: 'Express & Premium Laundry Services',
        logoUrl: '/logo.jpg',
        phone: '+91 98765 43210',
        email: 'contact@miraclelaundry.com',
        address: '123 Sparkle Avenue, Suite 4B, Commercial Hub',
        gstNumber: '27AABCU9603R1ZM',
        gstPercentage: 0,
        currencySymbol: '₹',
        currencyCode: 'INR',
        invoicePrefix: 'ML-',
        termsAndConditions: '1. Please inspect clothes upon delivery.\n2. Clothes not collected within 30 days are subject to storage charges.\n3. Colors may bleed on delicate items if not pre-informed.',
      });
      console.log('[SEED] Default settings created.');
    } else if (setting.shopName.includes('Intelligent') || setting.logoUrl.includes('unsplash') || setting.logoUrl.includes('Intelligent')) {
      setting.shopName = 'Miracle Laundry';
      setting.shopTagline = 'Express & Premium Laundry Services';
      setting.logoUrl = '/logo.jpg';
      setting.invoicePrefix = 'ML-';
      await setting.save();
      console.log('[SEED] Settings updated with Miracle Laundry branding.');
    }

    // 5. Seed Services (11 Main Services + 4 Kg Rates)
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      const defaultServices = [
        { name: 'Wash and Fold', price: 40, unit: 'kg', estimatedHours: 24, description: 'Everyday machine wash with eco-friendly detergent and neat folding', isActive: true },
        { name: 'Ironing', price: 15, unit: 'piece', estimatedHours: 12, description: 'Professional high-pressure steam press ironing', isActive: true },
        { name: 'Laundry', price: 50, unit: 'piece', estimatedHours: 24, description: 'Deep wash, fabric softener & steam press', isActive: true },
        { name: 'Premium Laundry', price: 80, unit: 'piece', estimatedHours: 24, description: 'Individual drum wash with luxury perfume finish', isActive: true },
        { name: 'Dry Cleaning', price: 150, unit: 'piece', estimatedHours: 48, description: 'Specialized chemical solvent cleaning for delicate garments', isActive: true },
        { name: 'Starch + Ironing', price: 30, unit: 'piece', estimatedHours: 12, description: 'Crisp starch finish with steam press', isActive: true },
        { name: 'Wash + Starch + Ironing', price: 70, unit: 'piece', estimatedHours: 24, description: 'Complete wash, starch treatment & steam press', isActive: true },
        { name: 'Saree Polishing', price: 100, unit: 'piece', estimatedHours: 36, description: 'Saree roll press & shine restoration', isActive: true },
        { name: 'Saree Pre-pleating', price: 120, unit: 'piece', estimatedHours: 24, description: 'Ready-to-wear pleating & box folding', isActive: true },
        { name: 'Shoes Cleaning', price: 200, unit: 'pair', estimatedHours: 48, description: 'Deep shoe scrubbing, midsole whitening & deodorizing', isActive: true },
        { name: 'Bag Cleaning', price: 250, unit: 'piece', estimatedHours: 48, description: 'Leather & fabric bag deep restoration', isActive: true },

        // Highlight Kg Rates
        { name: 'Wash & Iron (Kg Rate)', price: 120, unit: 'kg', estimatedHours: 24, description: 'Wash & Iron Rate per Kg', isActive: true },
        { name: 'Express Laundry (Kg Rate)', price: 199, unit: 'kg', estimatedHours: 12, description: 'Express Laundry Rate per Kg', isActive: true },
        { name: 'Premium Laundry (Kg Rate)', price: 159, unit: 'kg', estimatedHours: 24, description: 'Premium Laundry Rate per Kg', isActive: true },
        { name: 'Premium Express Laundry (Kg Rate)', price: 299, unit: 'kg', estimatedHours: 12, description: 'Premium Express Laundry Rate per Kg', isActive: true },
      ];
      await Service.insertMany(defaultServices);
      console.log('[SEED] Default laundry services seeded.');
    }

    console.log('[SEED] Database seeding complete!');
  } catch (error) {
    console.error('[SEED ERROR] Error during database seed:', error);
  }
};

if (require.main === module) {
  seedDatabase().then(() => mongoose.connection.close());
}

