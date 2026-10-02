/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel Unified Server
 * Combines Express API backend and Vite SPA middleware on port 3000 (0.0.0.0).
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { app as apiApp } from './server/index.js';
import { migrateDatabase } from './server/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  try {
    await migrateDatabase();
  } catch (err) {
    console.warn('[Digifeel DB Migration Warning]:', err);
  }

  const app = express();

  // Mount API backend directly
  app.use(apiApp);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Digifeel] Unified Full-Stack Application listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Digifeel Startup Error]:', err);
  process.exit(1);
});
