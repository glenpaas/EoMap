import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import cors from 'cors';

import { loadEnv } from './env.js';
loadEnv(); // must run before db.js reads ADMIN_USER / auth.js reads JWT_SECRET

const { bootstrap } = await import('./db.js');
const { requireAuth } = await import('./auth.js');
const { UPLOADS, PUBLIC } = await import('./paths.js');

const authRoutes = (await import('./routes/auth.js')).default;
const storeRoutes = (await import('./routes/stores.js')).default;
const userRoutes = (await import('./routes/users.js')).default;
const visitRoutes = (await import('./routes/visits.js')).default;
const photoRoutes = (await import('./routes/photos.js')).default;
const statsRoutes = (await import('./routes/stats.js')).default;

fs.mkdirSync(UPLOADS, { recursive: true });
bootstrap();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/stores', requireAuth, storeRoutes);
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/visits', requireAuth, visitRoutes);
app.use('/api/photos', requireAuth, photoRoutes);
app.use('/api/stats', requireAuth, statsRoutes);

// Admin panel — static assets, then an SPA fallback for every other GET.
app.use(express.static(PUBLIC));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Tundmatu päring' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error('[kylastusgraafik]', err);
  res.status(status).json({ error: err.message || 'Serveri viga' });
});

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const lan = lanAddress();
  console.log(`\n  Külastusgraafik backend`);
  console.log(`  ├─ Admin:  http://localhost:${PORT}`);
  console.log(`  ├─ LAN:    http://${lan}:${PORT}   ← use this in the mobile app`);
  console.log(`  └─ API:    http://localhost:${PORT}/api\n`);
});
