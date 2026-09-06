import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    let query: any = {};
    if (req.targetShopId) {
      query.shopId = req.targetShopId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Customer.countDocuments(query);
    const rawCustomers = await Customer.find(query)
      .populate('shopId', 'name code')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fast MongoDB Aggregation for order totals scoped by targetShopId
    const orderMatch: any = {};
    if (req.targetShopId) {
      orderMatch.shopId = new mongoose.Types.ObjectId(req.targetShopId);
    }

    const orderStats = await Order.aggregate([
      ...(Object.keys(orderMatch).length > 0 ? [{ $match: orderMatch }] : []),
      {
        $group: {
          _id: '$customer',
          mobiles: { $addToSet: '$customerSnapshot.mobile' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
        },
      },
    ]);

    const statsMapByCustId = new Map<string, { totalOrders: number; totalSpent: number }>();
    const statsMapByMobile = new Map<string, { totalOrders: number; totalSpent: number }>();

    orderStats.forEach((s) => {
      if (s._id) {
        statsMapByCustId.set(String(s._id), { totalOrders: s.totalOrders, totalSpent: s.totalSpent });
      }
      if (Array.isArray(s.mobiles)) {
        s.mobiles.forEach((m: string) => {
          if (m) statsMapByMobile.set(m, { totalOrders: s.totalOrders, totalSpent: s.totalSpent });
        });
      }
    });

    const customers = rawCustomers.map((c: any) => {
      const cIdStr = String(c._id);
      const st = statsMapByCustId.get(cIdStr) || statsMapByMobile.get(c.mobile) || { totalOrders: 0, totalSpent: 0 };
      return {
        ...c,
        totalOrders: st.totalOrders,
        totalSpent: st.totalSpent,
      };
    });

    res.json({
      success: true,
      customers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    const customerObj = await Customer.findById(req.params.id);
    if (!customerObj) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && customerObj.shopId && String(customerObj.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this customer belongs to another branch.' });
    }

    let orderFilter: any = {
      $or: [{ customer: customerObj._id }, { 'customerSnapshot.mobile': customerObj.mobile }],
    };
    if (req.targetShopId) {
      orderFilter.shopId = req.targetShopId;
    }

    const orders = await Order.find(orderFilter).sort({ createdAt: -1 });

    const customer = customerObj.toObject();
    customer.totalOrders = orders.length;
    customer.totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.json({
      success: true,
      customer,
      orders,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, mobile, address, email, notes, shopId } = req.body;

    if (!name || !mobile || !address) {
      return res.status(400).json({ success: false, message: 'Name, mobile number, and address are required' });
    }

    const targetShop = req.user?.role === 'super_admin' ? (req.targetShopId || shopId || null) : req.targetShopId;
    const existingQuery: any = { mobile };
    if (targetShop) {
      existingQuery.shopId = targetShop;
    }

    const existingCustomer = await Customer.findOne(existingQuery);
    if (existingCustomer) {
      return res.status(400).json({ success: false, message: 'Customer with this mobile number already exists in this branch' });
    }

    const customer = new Customer({
      shopId: targetShop,
      name,
      mobile,
      address,
      email: email || '',
      notes: notes || '',
      totalOrders: 0,
      totalSpent: 0,
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, mobile, address, email, notes, shopId } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && customer.shopId && String(customer.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this customer belongs to another branch.' });
    }

    if (mobile && mobile !== customer.mobile) {
      const existingQuery: any = { mobile, _id: { $ne: req.params.id } };
      if (req.targetShopId) {
        existingQuery.shopId = req.targetShopId;
      }
      const existing = await Customer.findOne(existingQuery);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Mobile number already used by another customer' });
      }
    }

    if (name) customer.name = name;
    if (mobile) customer.mobile = mobile;
    if (address) customer.address = address;
    if (email !== undefined) customer.email = email;
    if (notes !== undefined) customer.notes = notes;
    if (shopId !== undefined && req.user?.role === 'super_admin') customer.shopId = shopId;

    await customer.save();

    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (req.user?.role !== 'super_admin' && req.targetShopId && customer.shopId && String(customer.shopId) !== req.targetShopId) {
      return res.status(403).json({ success: false, message: 'Access denied: this customer belongs to another branch.' });
    }

    const orderCount = await Order.countDocuments({
      $or: [{ customer: customer._id }, { 'customerSnapshot.mobile': customer.mobile }],
    });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer with ${orderCount} existing order(s).`,
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

