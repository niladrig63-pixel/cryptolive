/**
 * F.L.O.W. Market Engine — Layer 1: Core Streaming Logic
 * 
 * Responsibilities:
 * - Binance WebSocket connection management
 * - Auto-reconnect with exponential backoff
 * - Payload parsing & validation
 * - Event emission to market_state
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/stream';

const STREAM_TYPES = ['trade', 'ticker', 'depth20@100ms', 'kline_1m'];

export class StreamCore extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.activeSymbols = new Set();
    this.reconnectAttempt = 0;
    this.maxReconnectDelay = 30_000;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.connectionTimer = null;
    this.isClosingIntentionally = false;
    this.lastMessageTime = 0;
    this.messageCount = 0;
  }

  /**
   * Build stream names for a symbol
   */
  _getStreamsForSymbol(symbol) {
    const s = symbol.toLowerCase();
    return [
      `${s}@trade`,
      `${s}@ticker`,
      `${s}@depth20@100ms`,
      `${s}@kline_1m`,
    ];
  }

  /**
   * Get all active stream names
   */
  _getAllStreams() {
    const streams = [];
    for (const symbol of this.activeSymbols) {
      streams.push(...this._getStreamsForSymbol(symbol));
    }
    return streams;
  }

  /**
   * Connect to Binance combined stream
   */
  connect(symbols = ['btcusdt']) {
    symbols.forEach(s => this.activeSymbols.add(s.toLowerCase()));

    if (this.activeSymbols.size === 0) return;

    const streams = this._getAllStreams();
    const url = `${BINANCE_WS_BASE}?streams=${streams.join('/')}`;

    this.isClosingIntentionally = false;
    this._cleanup();

    console.log(`[StreamCore] Connecting to ${streams.length} streams...`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log(`[StreamCore] Connected — ${this.activeSymbols.size} symbols, ${streams.length} streams`);
      this.reconnectAttempt = 0;
      this.emit('status', 'connected');

      // Proactive 24hr reconnect (at 23h 50m)
      this.connectionTimer = setTimeout(() => {
        console.log('[StreamCore] 24hr limit approaching — reconnecting proactively');
        this._reconnect();
      }, 23 * 60 * 60 * 1000 + 50 * 60 * 1000);
    });

    this.ws.on('message', (raw) => {
      this.lastMessageTime = Date.now();
      this.messageCount++;

      try {
        const msg = JSON.parse(raw.toString());
        const { stream, data } = msg;
        if (!stream || !data) return;

        const parsed = this._parseMessage(stream, data);
        if (parsed) {
          this.emit('data', parsed);
        }
      } catch (err) {
        console.error('[StreamCore] Parse error:', err.message);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[StreamCore] Disconnected — Code: ${code}`);
      this.emit('status', 'disconnected');
      if (!this.isClosingIntentionally) {
        this._scheduleReconnect();
      }
    });

    this.ws.on('error', (err) => {
      console.error(`[StreamCore] Error: ${err.message}`);
    });

    // ws library handles ping/pong automatically
  }

  /**
   * Parse incoming message based on stream type
   */
  _parseMessage(stream, data) {
    if (stream.includes('@trade')) return this._parseTrade(data);
    if (stream.includes('@ticker')) return this._parseTicker(data);
    if (stream.includes('@depth')) return this._parseDepth(stream, data);
    if (stream.includes('@kline')) return this._parseKline(data);
    return null;
  }

  _parseTrade(d) {
    if (d.e !== 'trade') return null;
    return {
      type: 'trade',
      symbol: d.s.toUpperCase(),
      tradeId: d.t,
      price: parseFloat(d.p),
      quantity: parseFloat(d.q),
      total: parseFloat(d.p) * parseFloat(d.q),
      time: d.T,
      isBuyerMaker: d.m,
      side: d.m ? 'sell' : 'buy',
    };
  }

  _parseTicker(d) {
    if (d.e !== '24hrTicker') return null;
    return {
      type: 'ticker',
      symbol: d.s.toUpperCase(),
      lastPrice: parseFloat(d.c),
      priceChange: parseFloat(d.p),
      priceChangePercent: parseFloat(d.P),
      weightedAvgPrice: parseFloat(d.w),
      highPrice: parseFloat(d.h),
      lowPrice: parseFloat(d.l),
      openPrice: parseFloat(d.o),
      volume: parseFloat(d.v),
      quoteVolume: parseFloat(d.q),
      bestBid: parseFloat(d.b),
      bestBidQty: parseFloat(d.B),
      bestAsk: parseFloat(d.a),
      bestAskQty: parseFloat(d.A),
      trades: d.n,
      eventTime: d.E,
    };
  }

  _parseDepth(stream, d) {
    if (!d.bids || !d.asks) return null;
    // Extract symbol from stream name: "btcusdt@depth20@100ms"
    const symbol = stream.split('@')[0].toUpperCase();

    const bids = d.bids.map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    }));
    const asks = d.asks.map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    }));

    // Compute cumulative totals
    let cumBid = 0;
    for (const b of bids) { cumBid += b.quantity; b.total = cumBid; }
    let cumAsk = 0;
    for (const a of asks) { cumAsk += a.quantity; a.total = cumAsk; }

    const midPrice = bids.length > 0 && asks.length > 0
      ? (bids[0].price + asks[0].price) / 2
      : 0;
    const spread = asks.length > 0 && bids.length > 0
      ? asks[0].price - bids[0].price
      : 0;

    return {
      type: 'depth',
      symbol,
      lastUpdateId: d.lastUpdateId,
      bids,
      asks,
      spread,
      spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
      midPrice,
      timestamp: Date.now(),
    };
  }

  _parseKline(d) {
    if (d.e !== 'kline' || !d.k) return null;
    const k = d.k;
    return {
      type: 'kline',
      symbol: d.s.toUpperCase(),
      interval: k.i,
      startTime: k.t,
      closeTime: k.T,
      open: parseFloat(k.o),
      close: parseFloat(k.c),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      volume: parseFloat(k.v),
      quoteVolume: parseFloat(k.q),
      trades: k.n,
      isClosed: k.x,
      takerBuyVolume: parseFloat(k.V),
    };
  }

  /**
   * Subscribe to a new symbol dynamically
   */
  addSymbol(symbol) {
    const s = symbol.toLowerCase();
    if (this.activeSymbols.has(s)) return;
    this.activeSymbols.add(s);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const streams = this._getStreamsForSymbol(s);
      this.ws.send(JSON.stringify({
        method: 'SUBSCRIBE',
        params: streams,
        id: Date.now(),
      }));
      console.log(`[StreamCore] Subscribed to ${s}`);
    }
  }

  /**
   * Unsubscribe from a symbol
   */
  removeSymbol(symbol) {
    const s = symbol.toLowerCase();
    if (!this.activeSymbols.has(s)) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const streams = this._getStreamsForSymbol(s);
      this.ws.send(JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: streams,
        id: Date.now(),
      }));
    }
    this.activeSymbols.delete(s);
    console.log(`[StreamCore] Unsubscribed from ${s}`);
  }

  /**
   * Exponential backoff reconnect
   */
  _scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), this.maxReconnectDelay);
    this.reconnectAttempt++;
    console.log(`[StreamCore] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.emit('status', 'reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.connect([...this.activeSymbols]);
    }, delay);
  }

  _reconnect() {
    this.isClosingIntentionally = true;
    this._cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    setTimeout(() => {
      this.connect([...this.activeSymbols]);
    }, 1000);
  }

  _cleanup() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.connectionTimer) { clearTimeout(this.connectionTimer); this.connectionTimer = null; }
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  /**
   * Graceful shutdown
   */
  disconnect() {
    this.isClosingIntentionally = true;
    this._cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.activeSymbols.clear();
    console.log('[StreamCore] Disconnected gracefully');
  }

  getStats() {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      symbols: [...this.activeSymbols],
      messageCount: this.messageCount,
      lastMessageTime: this.lastMessageTime,
      reconnectAttempt: this.reconnectAttempt,
    };
  }
}
