import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin';
import Shop from '../models/Shop';
import { AuthRequest } from '../middleware/auth';

// GET all users/admins
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, shopId, search } = req.query;
    let filter: any = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (shopId && shopId !== 'all') {
      filter.shopId = shopId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { username: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
        { phone: { $regex: search as string, $options: 'i' } },
      ];
    }

    const users = await Admin.find(filter)
      .select('-password')
      .populate('shopId', 'name code region phone')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE new user / branch admin
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, email, phone, role = 'branch_admin', shopId, isActive = true } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'Username, password, and name are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await Admin.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
    }

    if (role === 'branch_admin' && !shopId) {
      return res.status(400).json({ success: false, message: 'Shop assignment is required for Branch Admins.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await Admin.create({
      username: cleanUsername,
      password: hashedPassword,
      name: name.trim(),
      email: email?.trim() || `${cleanUsername}@miraclelaundry.com`,
      phone: phone?.trim() || '',
      role: role || 'branch_admin',
      shopId: shopId || null,
      isActive: isActive !== false,
    });

    const populated = await Admin.findById(newUser._id).select('-password').populate('shopId');

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      user: populated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE user
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, shopId, isActive, password } = req.body;

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role) user.role = role;
    if (shopId !== undefined) user.shopId = shopId || null;
    if (isActive !== undefined) user.isActive = isActive;

    if (password && password.trim().length > 0) {
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    const updated = await Admin.findById(id).select('-password').populate('shopId');

    res.json({
      success: true,
      message: 'User account updated successfully',
      user: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE user
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (req.user?.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = await Admin.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
