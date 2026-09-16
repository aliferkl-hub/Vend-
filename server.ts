import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { authenticateUser } from './src/middleware/auth.ts';
import { detectStorageStatus } from './src/db/index.ts';
import authRoutes from './src/server/authRoutes.ts';
import productRoutes from './src/server/productRoutes.ts';
import serviceRoutes from './src/server/serviceRoutes.ts';
import storeRoutes from './src/server/storeRoutes.ts';
import negotiationRoutes from './src/server/negotiationRoutes.ts';
import orderRoutes from './src/server/orderRoutes.ts';
import deliveryRoutes from './src/server/deliveryRoutes.ts';
import paymentRoutes from './src/server/paymentRoutes.ts';
import planRoutes from './src/server/planRoutes.ts';
import adminRoutes from './src/server/adminRoutes.ts';
import uploadRoutes from './src/server/uploadRoutes.ts';
import categoryRoutes from './src/server/categoryRoutes.ts';
import reviewRoutes from './src/server/reviewRoutes.ts';
import favoriteRoutes from './src/server/favoriteRoutes.ts';
import notificationRoutes from './src/server/notificationRoutes.ts';
import addressRoutes from './src/server/addressRoutes.ts';
import { initializeDatabaseSeed } from './src/server/seedData.ts';
import { runAccountMigration } from './src/server/accountMigration.ts';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Basic parsers
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));
  app.use(cookieParser());

  // Persistent uploads storage directory
  const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '7d',
  }));

  // Global authentication middleware (populates req.user if session/token exists)
  app.use(authenticateUser);

  // Health check
  app.get('/api/health', (req, res) => {
    const storage = detectStorageStatus();
    res.json({
      status: 'ok',
      service: 'VEND+ Marketplace API',
      timestamp: new Date().toISOString(),
      storage: {
        mechanism: storage.mechanism,
        engine: storage.engine,
        isEphemeralEnvironment: storage.isEphemeralEnvironment,
        statement: storage.statement,
      },
    });
  });

  // Storage status diagnostics
  app.get('/api/system/storage-status', (req, res) => {
    res.json(detectStorageStatus());
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/stores', storeRoutes);
  app.use('/api/negotiations', negotiationRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/addresses', addressRoutes);

  // Initialize background database migration, seeds, and master owner
  try {
    await runAccountMigration();
    await initializeDatabaseSeed();
  } catch (err: any) {
    console.error('Database initialization note:', err.message);
  }

  // Vite middleware for development vs static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VEND+] Servidor ativo em http://0.0.0.0:${PORT}`);
  });
}

startServer();
