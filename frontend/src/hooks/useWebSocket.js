/**
 * F.L.O.W. Market Engine — WebSocket Hook
 * 
 * Manages WebSocket connection to backend server.
 * Dispatches all messages to Zustand store.
 * No market logic here — pure connectivity.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useMarketStore } from '../stores/marketStore';

// Auto-detect: in production, WS connects to same host; in dev, proxy handles it
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = import.meta.env.PROD
  ? `${WS_PROTOCOL}//${window.location.host}/ws`
  : `ws://${window.location.hostname}:5173/ws`; // Vite proxy forwards to backend
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000];

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const activeSymbolRef = useRef('BTCUSDT');

  // Subscribe only to activeSymbol to avoid re-renders on data updates
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  activeSymbolRef.current = activeSymbol;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Use getState() for stable action references — never triggers re-renders
    const store = useMarketStore.getState();
    store.setConnectionStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to backend');
      useMarketStore.getState().setConnectionStatus('connected');
      reconnectAttemptRef.current = 0;

      // Subscribe to active symbol
      ws.send(JSON.stringify({ type: 'switch', symbol: activeSymbolRef.current }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const actions = useMarketStore.getState();

        switch (msg.type) {
          case 'snapshot':
            actions.handleSnapshot(msg.symbol, msg.data);
            break;
          case 'trade':
            actions.handleTradeMessage(msg);
            break;
          case 'ticker':
            actions.handleTickerMessage(msg);
            break;
          case 'depth':
            actions.handleOrderBookMessage(msg);
            break;
          case 'kline':
            actions.handleKlineMessage(msg);
            break;
          case 'status':
            if (msg.status === 'disconnected') {
              actions.setConnectionStatus('reconnecting');
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
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected from backend');
      useMarketStore.getState().setConnectionStatus('disconnected');
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }, []); // No dependencies — all state access via getState()

  const scheduleReconnect = useCallback(() => {
    const attempt = reconnectAttemptRef.current;
    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
    reconnectAttemptRef.current++;

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${attempt + 1})`);
    useMarketStore.getState().setConnectionStatus('reconnecting');

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  // Switch symbol
  const switchSymbol = useCallback((symbol) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'switch', symbol: symbol.toUpperCase() }));
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    // Heartbeat ping every 30s
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { switchSymbol };
}
