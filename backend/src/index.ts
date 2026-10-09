import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { seedDatabase } from './seed';

// Routes imports
import authRoutes from './routes/authRoutes';
import customerRoutes from './routes/customerRoutes';
import serviceRoutes from './routes/serviceRoutes';
import itemRoutes from './routes/itemRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import reportRoutes from './routes/reportRoutes';
import settingRoutes from './routes/settingRoutes';
import expenseRoutes from './routes/expenseRoutes';
import categoryRoutes from './routes/categoryRoutes';
import backupRoutes from './routes/backupRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import staffRoutes from './routes/staffRoutes';
import machineRoutes from './routes/machineRoutes';
import { initWhatsAppGateway } from './services/whatsappGateway';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(compression());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'X-Requested-With', 'Accept'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Base API health check with process.uptime() stats
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    dbConnected: mongoose.connection.readyState === 1,
    uptimeSeconds: Math.floor(process.uptime()),
    uptimeFormatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m ${Math.floor(process.uptime() % 60)}s`,
    message: 'Miracle Laundry API Server is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Database Connection Guard Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database Connection Error: Server cannot reach MongoDB Atlas. Please ensure 0.0.0.0/0 is added under MongoDB Atlas Network Access and MONGODB_URI is correct.',
    });
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/garment-categories', categoryRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/machines', machineRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[SERVER ERROR]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found`,
  });
});

// Uptime Keep-Alive Worker (Prevents Render Free Tier from going to sleep)
const startUptimeKeepAlive = () => {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
  if (!targetUrl) return;

  const healthUrl = `${targetUrl.replace(/\/$/, '')}/api/health`;
  console.log(`[UPTIME] Initializing Uptime Keep-Alive worker targeting: ${healthUrl}`);

  // Self-ping every 10 minutes (600,000 ms)
  setInterval(async () => {
    try {
      const res = await fetch(healthUrl);
      console.log(`[UPTIME PING] Keep-alive ping status: ${res.status} (Server Uptime: ${Math.floor(process.uptime())}s)`);
    } catch (err: any) {
      console.warn(`[UPTIME PING WARNING] Keep-alive ping failed: ${err.message}`);
    }
  }, 10 * 60 * 1000);
};

// Start Server & Initialize Database
const startServer = async () => {
  try {
    const isDBConnected = await connectDB();
    if (isDBConnected) {
      await seedDatabase();
    }
    initWhatsAppGateway();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` 🧺 MIRACLE LAUNDRY SHOP BACKEND IS RUNNING!`);
      console.log(` 🚀 Listening on: http://localhost:${PORT}`);
      console.log(` 📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
      startUptimeKeepAlive();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
