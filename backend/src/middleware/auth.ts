import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'laundry_shop_super_secret_jwt_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
  };
}

export const generateToken = (payload: { id: string; username: string; name: string }, rememberMe: boolean = false) => {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { id: string; username: string; name: string };
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
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};
