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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApi(marketState) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve frontend static build in production
  const staticPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(staticPath));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
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
