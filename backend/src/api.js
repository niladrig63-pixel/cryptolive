/**
 * F.L.O.W. Market Engine — REST API
 * 
 * Serves historical data from SQLite.
 * Used on initial frontend load and symbol switch.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getKlines, getTrades } from './db.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApi(marketState) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve frontend static build in production
  const staticPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  console.log(`[API] Static path: ${staticPath}`);
  console.log(`[API] Static path exists: ${fs.existsSync(staticPath)}`);
  if (fs.existsSync(staticPath)) {
    console.log(`[API] Static contents: ${fs.readdirSync(staticPath).join(', ')}`);
  }
  app.use(express.static(staticPath));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Debug endpoint - check static file serving
  app.get('/api/debug', (req, res) => {
    const exists = fs.existsSync(staticPath);
    const contents = exists ? fs.readdirSync(staticPath) : [];
    const indexExists = exists ? fs.existsSync(path.join(staticPath, 'index.html')) : false;
    res.json({
      staticPath,
      exists,
      contents,
      indexExists,
      dirname: __dirname,
      cwd: process.cwd(),
      port: process.env.PORT || 4000,
    });
  });

  // Historical klines
  app.get('/api/klines', (req, res) => {
    const { symbol = 'BTCUSDT', interval = '1m', limit = '200' } = req.query;
    const klines = getKlines(symbol, interval, parseInt(limit));
    res.json(klines);
  });

  // Historical trades
  app.get('/api/trades', (req, res) => {
    const { symbol = 'BTCUSDT', limit = '500' } = req.query;
    const trades = getTrades(symbol, parseInt(limit));
    res.json(trades);
  });

  // Current state snapshot for a symbol
  app.get('/api/snapshot/:symbol', (req, res) => {
    const snapshot = marketState.getSnapshot(req.params.symbol);
    res.json(snapshot);
  });

  // List tracked symbols
  app.get('/api/symbols', (req, res) => {
    res.json(marketState.getSymbols());
  });

  // SPA fallback — serve index.html for all non-API routes (production)
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  return app;
}
