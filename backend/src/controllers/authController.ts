import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin';
import Shop from '../models/Shop';
import { generateToken, AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both username and password' });
    }

    const admin = await Admin.findOne({ username }).populate('shopId');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (admin.isActive === false) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact the Super Admin.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const shopIdStr = admin.shopId ? (admin.shopId as any)._id?.toString() || admin.shopId.toString() : null;

    const token = generateToken(
      {
        id: admin._id.toString(),
        username: admin.username,
        name: admin.name,
        role: admin.role || 'super_admin',
        shopId: shopIdStr,
      },
      !!rememberMe
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        role: admin.role || 'super_admin',
        shopId: shopIdStr,
        shop: admin.shopId || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const admin = await Admin.findById(req.user.id).select('-password').populate('shopId');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }
    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        role: admin.role || 'super_admin',
        shopId: admin.shopId ? (admin.shopId as any)._id?.toString() || admin.shopId.toString() : null,
        shop: admin.shopId || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.user?.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phone !== undefined) admin.phone = phone;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to change password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      admin.password = await bcrypt.hash(newPassword, 10);
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        role: admin.role,
        shopId: admin.shopId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

