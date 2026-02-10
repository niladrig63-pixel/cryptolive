/**
 * F.L.O.W. Market Engine — WebSocket Server (Relay to Frontend)
 * 
 * Relays parsed market data from backend to connected frontend clients.
 * Handles symbol subscription management per client.
 */

import { WebSocketServer } from 'ws';

export function createWsServer(server, marketState, streamCore) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map(); // ws -> { subscribedSymbols: Set }

  wss.on('connection', (ws) => {
    console.log('[WS Server] Client connected');
    clients.set(ws, { subscribedSymbols: new Set(['BTCUSDT']) });

    // Send initial snapshot
    const snapshot = marketState.getSnapshot('BTCUSDT');
    ws.send(JSON.stringify({ type: 'snapshot', symbol: 'BTCUSDT', data: snapshot }));

    // Send connection status
    ws.send(JSON.stringify({ type: 'status', status: 'connected' }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(ws, msg, marketState, streamCore);
      } catch (err) {
        console.error('[WS Server] Invalid client message:', err.message);
      }
    });

    ws.on('close', () => {
      console.log('[WS Server] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS Server] Client error:', err.message);
      clients.delete(ws);
    });
  });

  function handleClientMessage(ws, msg, marketState, streamCore) {
    const clientState = clients.get(ws);
    if (!clientState) return;

    switch (msg.type) {
      case 'subscribe': {
        const symbol = msg.symbol.toUpperCase();
        clientState.subscribedSymbols.add(symbol);
        streamCore.addSymbol(symbol.toLowerCase());

        // Send snapshot for new symbol
        const snapshot = marketState.getSnapshot(symbol);
        ws.send(JSON.stringify({ type: 'snapshot', symbol, data: snapshot }));
        break;
      }

      case 'unsubscribe': {
        const symbol = msg.symbol.toUpperCase();
        clientState.subscribedSymbols.delete(symbol);
        break;
      }

      case 'switch': {
        const newSymbol = msg.symbol.toUpperCase();
        clientState.subscribedSymbols.clear();
        clientState.subscribedSymbols.add(newSymbol);
        streamCore.addSymbol(newSymbol.toLowerCase());

        const snapshot = marketState.getSnapshot(newSymbol);
        ws.send(JSON.stringify({ type: 'snapshot', symbol: newSymbol, data: snapshot }));
        break;
      }

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
    }
  }

  /**
   * Broadcast data to subscribed clients
   */
  function broadcast(data) {
    const symbol = data.symbol;
    const payload = JSON.stringify(data);

    for (const [ws, state] of clients) {
      if (ws.readyState === 1 && state.subscribedSymbols.has(symbol)) {
        try {
          ws.send(payload);
        } catch (err) {
          // Client gone, will be cleaned up on close
        }
      }
    }
  }

  /**
   * Broadcast connection status to all clients
   */
  function broadcastStatus(status) {
    const payload = JSON.stringify({ type: 'status', status });
    for (const [ws] of clients) {
      if (ws.readyState === 1) {
        try { ws.send(payload); } catch {}
      }
    }
  }

  return { wss, broadcast, broadcastStatus, getClientCount: () => clients.size };
}
