import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Shop from '../models/Shop';
import Order from '../models/Order';
import Customer from '../models/Customer';
import Staff from '../models/Staff';
import Expense from '../models/Expense';
import Admin from '../models/Admin';
import { AuthRequest } from '../middleware/auth';

// GET all shops with live metrics
export const getShops = async (req: AuthRequest, res: Response) => {
  try {
    const { search, region, activeOnly } = req.query;
    let filter: any = {};

    if (req.user?.role !== 'super_admin') {
      filter._id = req.user?.shopId;
    }

    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    if (region && region !== 'all') {
      filter.region = region;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { code: { $regex: search as string, $options: 'i' } },
        { region: { $regex: search as string, $options: 'i' } },
        { phone: { $regex: search as string, $options: 'i' } },
      ];
    }

    const shops = await Shop.find(filter).sort({ createdAt: -1 }).lean();

    // Compute live performance metrics per shop
    const shopIds = shops.map((s) => s._id);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const [orderStats, todayStats, staffStats] = await Promise.all([
      Order.aggregate([
        { $match: { shopId: { $in: shopIds } } },
        {
          $group: {
            _id: '$shopId',
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            pendingOrders: {
              $sum: {
                $cond: [{ $in: ['$status', ['Received', 'Washing', 'Drying', 'Ironing', 'Packing', 'Ready for Delivery', 'Ready for Pickup']] }, 1, 0],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        { $match: { shopId: { $in: shopIds }, orderDate: { $gte: todayStart } } },
        {
          $group: {
            _id: '$shopId',
            todayOrders: { $sum: 1 },
            todayRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      Staff.aggregate([
        { $match: { shopId: { $in: shopIds }, status: 'Active' } },
        {
          $group: {
            _id: '$shopId',
            activeStaff: { $sum: 1 },
          },
        },
      ]),
    ]);

    const orderStatsMap = new Map<string, any>(orderStats.map((s) => [s._id.toString(), s]));
    const todayStatsMap = new Map<string, any>(todayStats.map((s) => [s._id.toString(), s]));
    const staffStatsMap = new Map<string, any>(staffStats.map((s) => [s._id.toString(), s]));

    const enrichedShops = shops.map((s) => {
      const id = s._id.toString();
      const os = orderStatsMap.get(id) || { totalOrders: 0, totalRevenue: 0, pendingOrders: 0 };
      const ts = todayStatsMap.get(id) || { todayOrders: 0, todayRevenue: 0 };
      const ss = staffStatsMap.get(id) || { activeStaff: 0 };

      return {
        ...s,
        metrics: {
          totalOrders: os.totalOrders,
          totalRevenue: os.totalRevenue,
          pendingOrders: os.pendingOrders,
          todayOrders: ts.todayOrders,
          todayRevenue: ts.todayRevenue,
          activeStaff: ss.activeStaff,
        },
      };
    });

    res.json({
      success: true,
      shops: enrichedShops,
      total: enrichedShops.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET shop by ID
export const getShopById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.role !== 'super_admin' && req.targetShopId && String(req.targetShopId) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own branch.' });
    }
    const shop = await Shop.findById(id);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    res.json({ success: true, shop });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE new shop/branch
export const createShop = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      code,
      region,
      phone,
      email,
      address,
      invoicePrefix,
      gstNumber,
      gstPercentage,
      currencySymbol,
      currencyCode,
      upiId,
      gpayNumber,
      paymentQrUrl,
      logoUrl,
      termsAndConditions,
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Shop name and branch code are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Shop.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Branch code '${cleanCode}' already exists.` });
    }

    const shop = await Shop.create({
      name: name.trim(),
      code: cleanCode,
      region: region?.trim() || 'General',
      phone: phone?.trim() || '+91 98765 43210',
      email: email?.trim() || 'contact@miraclelaundry.com',
      address: address?.trim() || 'Branch Address',
      invoicePrefix: invoicePrefix?.trim() || `ORD-${cleanCode}-`,
      gstNumber: gstNumber?.trim() || '',
      gstPercentage: Number(gstPercentage) || 0,
      currencySymbol: currencySymbol || '₹',
      currencyCode: currencyCode || 'INR',
      upiId: upiId?.trim() || '',
      gpayNumber: gpayNumber?.trim() || '',
      paymentQrUrl: paymentQrUrl || '',
      logoUrl: logoUrl || '',
      termsAndConditions: termsAndConditions || '1. Clothes not collected within 30 days are subject to storage charges.',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Shop / Branch created successfully',
      shop,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE shop details
export const updateShop = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
      const existing = await Shop.findOne({ code: updateData.code, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Branch code '${updateData.code}' is already taken.` });
      }
    }

    const shop = await Shop.findByIdAndUpdate(id, updateData, { new: true });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    res.json({
      success: true,
      message: 'Shop updated successfully',
      shop,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE / Permanently delete shop
export const deleteShop = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    const shop = await Shop.findById(id);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (hardDelete === 'false') {
      shop.isActive = false;
      await shop.save();
      return res.json({
        success: true,
        message: `Branch '${shop.name}' (${shop.code}) deactivated successfully`,
        shop,
      });
    }

    await Shop.findByIdAndDelete(id);
    await Admin.updateMany({ shopId: id }, { $unset: { shopId: 1 } });
    await Staff.updateMany({ shopId: id }, { $unset: { shopId: 1 } });

    res.json({
      success: true,
      message: `Branch '${shop.name}' (${shop.code}) was deleted successfully`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET multi-shop aggregated overview for Super Admin Dashboard
export const getShopOverview = async (req: AuthRequest, res: Response) => {
  try {
    const shops = await Shop.find().lean();
    const totalShops = shops.length;
    const activeShops = shops.filter((s) => s.isActive).length;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [allTimeStats, todayStats, monthStats, regionStats] = await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
          },
        },
      ]),
      Order.aggregate([
        { $match: { orderDate: { $gte: todayStart } } },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: '$totalAmount' },
            todayOrders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: { orderDate: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            monthRevenue: { $sum: '$totalAmount' },
            monthOrders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $lookup: {
            from: 'shops',
            localField: 'shopId',
            foreignField: '_id',
            as: 'shopInfo',
          },
        },
        { $unwind: { path: '$shopInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$shopInfo.region', 'General'] },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    const totalCustomers = await Customer.countDocuments();
    const totalStaff = await Staff.countDocuments({ status: 'Active' });

    res.json({
      success: true,
      stats: {
        totalShops,
        activeShops,
        totalRevenue: allTimeStats[0]?.totalRevenue || 0,
        totalOrders: allTimeStats[0]?.totalOrders || 0,
        deliveredOrders: allTimeStats[0]?.deliveredOrders || 0,
        todayRevenue: todayStats[0]?.todayRevenue || 0,
        todayOrders: todayStats[0]?.todayOrders || 0,
        monthRevenue: monthStats[0]?.monthRevenue || 0,
        monthOrders: monthStats[0]?.monthOrders || 0,
        totalCustomers,
        totalStaff,
      },
      regionalBreakdown: regionStats.map((r) => ({
        region: r._id,
        revenue: r.revenue,
        orders: r.orders,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
