import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'laundry_shop_super_secret_jwt_key_2026';

export interface AuthUserPayload {
  id: string;
  username: string;
  name: string;
  role: 'super_admin' | 'branch_admin' | 'staff';
  shopId?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
  targetShopId?: string | null;
}

export const generateToken = (payload: AuthUserPayload, rememberMe: boolean = false) => {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): AuthUserPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  return {
    id: decoded.id,
    username: decoded.username,
    name: decoded.name,
    role: decoded.role || 'super_admin',
    shopId: decoded.shopId || null,
  };
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized access. No token provided.' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;

    // Apply Shop Isolation Scoping
    if (decoded.role === 'super_admin') {
      const headerShopId = req.headers['x-shop-id'] as string;
      const queryShopId = req.query.shopId as string;
      const selected = headerShopId || queryShopId || null;
      req.targetShopId = selected && selected !== 'all' && selected !== 'null' && selected !== 'undefined' ? selected : null;
    } else {
      // Branch Admin or Staff is strictly locked to their assigned shopId
      req.targetShopId = decoded.shopId ? String(decoded.shopId) : null;
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Permission denied. Super Admin access required.',
    });
  }
  next();
};

