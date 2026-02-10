/**
 * F.L.O.W. Market Engine — WebSocket Service
 * 
 * Pure module-level WebSocket manager.
 * NOT a React hook — completely decoupled from React render cycle.
 * Pushes all data directly to Zustand store via getState().
 */

import { useMarketStore } from '../stores/marketStore';

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = import.meta.env.PROD
  ? `${WS_PROTOCOL}//${window.location.host}/ws`
  : `ws://${window.location.hostname}:5173/ws`;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000];

let ws = null;
let reconnectAttempt = 0;
let reconnectTimer = null;
let pingInterval = null;
let activeSymbol = 'BTCUSDT';
let started = false;

function getStore() {
  return useMarketStore.getState();
}

function handleMessage(event) {
  try {
    const msg = JSON.parse(event.data);
    const store = getStore();

    switch (msg.type) {
      case 'snapshot':
        store.handleSnapshot(msg.symbol, msg.data);
        break;
      case 'trade':
        store.handleTradeMessage(msg);
        break;
      case 'ticker':
        store.handleTickerMessage(msg);
        break;
      case 'depth':
        store.handleOrderBookMessage(msg);
        break;
      case 'kline':
        store.handleKlineMessage(msg);
        break;
      case 'status':
        if (msg.status === 'disconnected') {
          store.setConnectionStatus('reconnecting');
        }
        break;
      case 'pong':
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('[WS] Parse error:', err);
  }
}

function connect() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  getStore().setConnectionStatus('connecting');

  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    console.error('[WS] Failed to create WebSocket:', err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log('[WS] Connected to backend');
    getStore().setConnectionStatus('connected');
    reconnectAttempt = 0;
    ws.send(JSON.stringify({ type: 'switch', symbol: activeSymbol }));
  };

  ws.onmessage = handleMessage;

  ws.onclose = () => {
    console.log('[WS] Disconnected');
    getStore().setConnectionStatus('disconnected');
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    console.error('[WS] Error:', err);
  };
}

function scheduleReconnect() {
  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
  reconnectAttempt++;
  console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
  getStore().setConnectionStatus('reconnecting');
  reconnectTimer = setTimeout(connect, delay);
}

/** Start the WebSocket connection (call once from main.jsx) */
export function startWebSocket() {
  if (started) return;
  started = true;
  connect();

  // Heartbeat ping every 30s
  pingInterval = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
}

/** Switch active symbol (called from components) */
export function switchSymbol(symbol) {
  activeSymbol = symbol.toUpperCase();
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'switch', symbol: activeSymbol }));
  }
}

/** Cleanup (optional) */
export function stopWebSocket() {
  started = false;
  if (pingInterval) clearInterval(pingInterval);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
}
