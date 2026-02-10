/**
 * F.L.O.W. Market Engine — SQLite Persistence (sql.js)
 * 
 * Stores completed klines and recent trades for historical queries.
 * Uses sql.js (pure JS SQLite, no native bindings).
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'market.db');

let db = null;

export async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing DB if available
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS klines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      interval TEXT NOT NULL,
      open_time INTEGER NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      close_time INTEGER NOT NULL,
      trades INTEGER NOT NULL,
      UNIQUE(symbol, interval, open_time)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      trade_id INTEGER NOT NULL,
      price REAL NOT NULL,
      quantity REAL NOT NULL,
      time INTEGER NOT NULL,
      is_buyer_maker INTEGER NOT NULL,
      UNIQUE(symbol, trade_id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_klines_symbol_time ON klines(symbol, interval, open_time)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trades_symbol_time ON trades(symbol, time)`);

  console.log('[DB] Database initialized');
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Batch trade buffer
let tradeBatch = [];
let batchTimer = null;

export function insertTrade(trade) {
  tradeBatch.push(trade);
  if (tradeBatch.length >= 100) {
    flushTrades();
  } else if (!batchTimer) {
    batchTimer = setTimeout(flushTrades, 5000);
  }
}

function flushTrades() {
  if (!db || tradeBatch.length === 0) return;
  if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO trades (symbol, trade_id, price, quantity, time, is_buyer_maker) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const t of tradeBatch) {
    stmt.run([t.symbol, t.tradeId, t.price, t.quantity, t.time, t.isBuyerMaker ? 1 : 0]);
  }
  stmt.free();
  tradeBatch = [];
  saveDb();
}

export function insertKline(kline) {
  if (!db) return;
  try {
    db.run(
      'INSERT OR REPLACE INTO klines (symbol, interval, open_time, open, high, low, close, volume, close_time, trades) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [kline.symbol, kline.interval, kline.startTime, kline.open, kline.high, kline.low, kline.close, kline.volume, kline.closeTime, kline.trades]
    );
    saveDb();
  } catch (err) {
    // Ignore duplicates
  }
}

export function getKlines(symbol, interval = '1m', limit = 200) {
  if (!db) return [];
  const stmt = db.prepare(
    'SELECT open_time, open, high, low, close, volume FROM klines WHERE symbol = ? AND interval = ? ORDER BY open_time DESC LIMIT ?'
  );
  stmt.bind([symbol.toUpperCase(), interval, limit]);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      time: Math.floor(row.open_time / 1000),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    });
  }
  stmt.free();
  return results.reverse();
}

export function getTrades(symbol, limit = 500) {
  if (!db) return [];
  const stmt = db.prepare(
    'SELECT trade_id, price, quantity, time, is_buyer_maker FROM trades WHERE symbol = ? ORDER BY time DESC LIMIT ?'
  );
  stmt.bind([symbol.toUpperCase(), limit]);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      tradeId: row.trade_id,
      price: row.price,
      quantity: row.quantity,
      time: row.time,
      isBuyerMaker: row.is_buyer_maker === 1,
      side: row.is_buyer_maker === 1 ? 'sell' : 'buy',
    });
  }
  stmt.free();
  return results.reverse();
}

export function pruneTrades(olderThanMs = 24 * 60 * 60 * 1000) {
  if (!db) return;
  const cutoff = Date.now() - olderThanMs;
  db.run('DELETE FROM trades WHERE time < ?', [cutoff]);
  saveDb();
}

export function closeDatabase() {
  if (tradeBatch.length > 0) flushTrades();
  if (db) { db.close(); db = null; }
}
