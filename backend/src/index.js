/**
 * F.L.O.W. Market Engine — Backend Entry Point
 * 
 * Orchestrates all layers:
 * - Layer 1: StreamCore (Binance WebSocket client)
 * - Layer 2: MarketState (state management) + DB (persistence)
 * - Relay: WS Server (frontend clients) + REST API (historical data)
 */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { StreamCore } from './stream_core.js';
import { MarketState } from './market_state.js';
import { initDatabase, insertTrade, insertKline, pruneTrades, closeDatabase } from './db.js';
import { createApi } from './api.js';
import { createWsServer } from './ws_server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 4000;
const DEFAULT_SYMBOLS = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt'];

async function main() {
  console.log('='.repeat(50));
  console.log('F.L.O.W. Market Engine — Starting...');
  console.log('='.repeat(50));

  // Initialize database
  await initDatabase();

  // Layer 2: State management
  const marketState = new MarketState();

  // Layer 1: Stream core
  const streamCore = new StreamCore();

  // REST API
  const app = createApi(marketState);
  const server = http.createServer(app);

  // WebSocket relay server
  const { broadcast, broadcastStatus } = createWsServer(server, marketState, streamCore);

  // Wire StreamCore events to MarketState + Broadcast + DB
  streamCore.on('data', (parsed) => {
    const result = marketState.handleData(parsed);
    if (result) {
      broadcast(result);

      // Persist to DB
      if (parsed.type === 'trade') {
        insertTrade(parsed);
      } else if (parsed.type === 'kline' && parsed.isClosed) {
        insertKline(parsed);
      }
    }
  });

  streamCore.on('status', (status) => {
    console.log(`[Engine] Stream status: ${status}`);
    broadcastStatus(status);
  });

  // Start HTTP + WS server
  server.listen(PORT, () => {
    console.log(`[Engine] HTTP + WS server on port ${PORT}`);
    console.log(`[Engine] REST API: http://localhost:${PORT}/api/health`);
    console.log(`[Engine] WebSocket: ws://localhost:${PORT}/ws`);
  });

  // Connect to Binance
  streamCore.connect(DEFAULT_SYMBOLS);

  // Prune old trades daily
  setInterval(() => {
    pruneTrades();
    console.log('[Engine] Pruned old trades');
  }, 24 * 60 * 60 * 1000);

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Engine] Shutting down...');
    streamCore.disconnect();
    closeDatabase();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`[Engine] Subscribed to: ${DEFAULT_SYMBOLS.join(', ')}`);
  console.log('='.repeat(50));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
