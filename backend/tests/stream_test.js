/**
 * F.L.O.W. Market Engine — Phase 2: Stream Connectivity Test
 * 
 * Validates Binance WebSocket connection stability and payload structure
 * against documented schemas in stream_schema.md.
 * 
 * Usage: node tests/stream_test.js
 */

import WebSocket from 'ws';

const BINANCE_WS = 'wss://stream.binance.com:9443/stream';
const TEST_SYMBOL = 'btcusdt';
const TEST_DURATION_MS = 15_000; // 15 seconds
const STREAMS = [
  `${TEST_SYMBOL}@trade`,
  `${TEST_SYMBOL}@ticker`,
  `${TEST_SYMBOL}@depth20@100ms`,
  `${TEST_SYMBOL}@kline_1m`,
];

// --- Schema validators (manual, lightweight) ---

function validateTrade(d) {
  return (
    d.e === 'trade' &&
    typeof d.E === 'number' &&
    typeof d.s === 'string' &&
    typeof d.t === 'number' &&
    typeof d.p === 'string' &&
    typeof d.q === 'string' &&
    typeof d.T === 'number' &&
    typeof d.m === 'boolean'
  );
}

function validateTicker(d) {
  return (
    d.e === '24hrTicker' &&
    typeof d.E === 'number' &&
    typeof d.s === 'string' &&
    typeof d.c === 'string' &&  // last price
    typeof d.p === 'string' &&  // price change
    typeof d.P === 'string' &&  // price change %
    typeof d.h === 'string' &&  // high
    typeof d.l === 'string' &&  // low
    typeof d.v === 'string' &&  // volume
    typeof d.n === 'number'     // trade count
  );
}

function validateDepth(d) {
  return (
    typeof d.lastUpdateId === 'number' &&
    Array.isArray(d.bids) &&
    Array.isArray(d.asks) &&
    d.bids.length > 0 &&
    d.asks.length > 0 &&
    Array.isArray(d.bids[0]) &&
    d.bids[0].length === 2 &&
    typeof d.bids[0][0] === 'string' &&
    typeof d.bids[0][1] === 'string'
  );
}

function validateKline(d) {
  return (
    d.e === 'kline' &&
    typeof d.E === 'number' &&
    typeof d.s === 'string' &&
    typeof d.k === 'object' &&
    typeof d.k.t === 'number' &&  // start time
    typeof d.k.o === 'string' &&  // open
    typeof d.k.c === 'string' &&  // close
    typeof d.k.h === 'string' &&  // high
    typeof d.k.l === 'string' &&  // low
    typeof d.k.v === 'string' &&  // volume
    typeof d.k.x === 'boolean'    // is closed
  );
}

// --- Test runner ---

const stats = {
  trade: { received: 0, valid: 0, invalid: 0, firstPayload: null },
  ticker: { received: 0, valid: 0, invalid: 0, firstPayload: null },
  depth: { received: 0, valid: 0, invalid: 0, firstPayload: null },
  kline: { received: 0, valid: 0, invalid: 0, firstPayload: null },
  unknown: { received: 0 },
  errors: [],
};

console.log('='.repeat(60));
console.log('F.L.O.W. Market Engine — Stream Connectivity Test');
console.log('='.repeat(60));
console.log(`Symbol:   ${TEST_SYMBOL.toUpperCase()}`);
console.log(`Streams:  ${STREAMS.join(', ')}`);
console.log(`Duration: ${TEST_DURATION_MS / 1000}s`);
console.log('='.repeat(60));
console.log('Connecting to Binance WebSocket...\n');

const url = `${BINANCE_WS}?streams=${STREAMS.join('/')}`;
const ws = new WebSocket(url);
const startTime = Date.now();

ws.on('open', () => {
  console.log(`[CONNECTED] ${new Date().toISOString()}`);
  console.log(`URL: ${url}\n`);
  console.log('Listening for messages...\n');
});

ws.on('message', (raw) => {
  try {
    const msg = JSON.parse(raw.toString());
    const streamName = msg.stream;
    const data = msg.data;

    if (!streamName || !data) {
      stats.unknown.received++;
      return;
    }

    if (streamName.includes('@trade')) {
      stats.trade.received++;
      if (validateTrade(data)) {
        stats.trade.valid++;
        if (!stats.trade.firstPayload) {
          stats.trade.firstPayload = data;
          console.log(`[TRADE] First payload received — Price: ${data.p}, Qty: ${data.q}`);
        }
      } else {
        stats.trade.invalid++;
        stats.errors.push({ stream: 'trade', data });
      }
    } else if (streamName.includes('@ticker')) {
      stats.ticker.received++;
      if (validateTicker(data)) {
        stats.ticker.valid++;
        if (!stats.ticker.firstPayload) {
          stats.ticker.firstPayload = data;
          console.log(`[TICKER] First payload received — Last: ${data.c}, Change: ${data.P}%`);
        }
      } else {
        stats.ticker.invalid++;
        stats.errors.push({ stream: 'ticker', data });
      }
    } else if (streamName.includes('@depth')) {
      stats.depth.received++;
      if (validateDepth(data)) {
        stats.depth.valid++;
        if (!stats.depth.firstPayload) {
          stats.depth.firstPayload = { lastUpdateId: data.lastUpdateId, bids: data.bids.length, asks: data.asks.length };
          console.log(`[DEPTH]  First payload received — Bids: ${data.bids.length}, Asks: ${data.asks.length}`);
        }
      } else {
        stats.depth.invalid++;
        stats.errors.push({ stream: 'depth', data });
      }
    } else if (streamName.includes('@kline')) {
      stats.kline.received++;
      if (validateKline(data)) {
        stats.kline.valid++;
        if (!stats.kline.firstPayload) {
          stats.kline.firstPayload = data.k;
          console.log(`[KLINE]  First payload received — O:${data.k.o} H:${data.k.h} L:${data.k.l} C:${data.k.c}`);
        }
      } else {
        stats.kline.invalid++;
        stats.errors.push({ stream: 'kline', data });
      }
    } else {
      stats.unknown.received++;
    }
  } catch (err) {
    stats.errors.push({ error: err.message, raw: raw.toString().slice(0, 200) });
  }
});

ws.on('error', (err) => {
  console.error(`[ERROR] ${err.message}`);
  stats.errors.push({ error: err.message });
});

ws.on('close', (code, reason) => {
  console.log(`\n[DISCONNECTED] Code: ${code}, Reason: ${reason || 'none'}`);
});

// --- End test after duration ---

setTimeout(() => {
  ws.close();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Duration: ${elapsed}s\n`);

  const streams = ['trade', 'ticker', 'depth', 'kline'];
  let allValid = true;

  for (const s of streams) {
    const st = stats[s];
    const status = st.received > 0 && st.invalid === 0 ? 'PASS' : st.received === 0 ? 'NO DATA' : 'FAIL';
    if (status !== 'PASS') allValid = false;
    console.log(`  ${s.toUpperCase().padEnd(8)} | Received: ${String(st.received).padStart(5)} | Valid: ${String(st.valid).padStart(5)} | Invalid: ${String(st.invalid).padStart(3)} | ${status}`);
  }

  if (stats.unknown.received > 0) {
    console.log(`  UNKNOWN  | Received: ${stats.unknown.received}`);
  }

  if (stats.errors.length > 0) {
    console.log(`\n  Errors (${stats.errors.length}):`);
    stats.errors.slice(0, 5).forEach((e, i) => {
      console.log(`    ${i + 1}. ${JSON.stringify(e).slice(0, 200)}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(allValid ? 'OVERALL: ALL STREAMS VALIDATED — READY FOR PHASE 3' : 'OVERALL: ISSUES DETECTED — CHECK ERRORS ABOVE');
  console.log('='.repeat(60));

  process.exit(allValid ? 0 : 1);
}, TEST_DURATION_MS);
