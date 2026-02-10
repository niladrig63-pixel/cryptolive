/**
 * F.L.O.W. Market Engine — Zustand Store
 * 
 * Central state management for all market data.
 * All data flows through this store — no direct WS logic in components.
 */

import { create } from 'zustand';

const MAX_TRADES = 500;
const MAX_KLINES = 200;

export const useMarketStore = create((set, get) => ({
  // === Connection ===
  connectionStatus: 'connecting', // connecting | connected | disconnected | reconnecting
  reconnectAttempts: 0,
  lastMessageTime: 0,

  // === Active Symbol ===
  activeSymbol: 'BTCUSDT',
  availableSymbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],

  // === Market Data ===
  trades: {},      // { BTCUSDT: [...], ETHUSDT: [...] }
  tickers: {},     // { BTCUSDT: {...}, ETHUSDT: {...} }
  orderBooks: {},  // { BTCUSDT: {...} }
  klines: {},      // { BTCUSDT: [...] }
  priceDirections: {}, // { BTCUSDT: "up" | "down" | "neutral" }

  // === Actions ===
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol.toUpperCase() }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // Handle snapshot from backend (initial load / symbol switch)
  handleSnapshot: (symbol, data) => set((state) => {
    const s = symbol.toUpperCase();
    return {
      trades: { ...state.trades, [s]: data.trades || [] },
      tickers: { ...state.tickers, [s]: data.ticker || state.tickers[s] },
      orderBooks: { ...state.orderBooks, [s]: data.orderBook || state.orderBooks[s] },
      klines: { ...state.klines, [s]: data.klines || [] },
      priceDirections: { ...state.priceDirections, [s]: data.priceDirection || 'neutral' },
      lastMessageTime: Date.now(),
    };
  }),

  handleTradeMessage: (data) => set((state) => {
    const { symbol, trade, direction } = data;
    const existing = state.trades[symbol] || [];
    const updated = [...existing, trade];
    if (updated.length > MAX_TRADES) {
      updated.splice(0, updated.length - MAX_TRADES);
    }
    return {
      trades: { ...state.trades, [symbol]: updated },
      priceDirections: { ...state.priceDirections, [symbol]: direction },
      lastMessageTime: Date.now(),
    };
  }),

  handleTickerMessage: (data) => set((state) => ({
    tickers: { ...state.tickers, [data.symbol]: data.ticker },
    lastMessageTime: Date.now(),
  })),

  handleOrderBookMessage: (data) => set((state) => ({
    orderBooks: { ...state.orderBooks, [data.symbol]: data.depth },
    lastMessageTime: Date.now(),
  })),

  handleKlineMessage: (data) => set((state) => {
    const { symbol, kline } = data;
    const existing = state.klines[symbol] || [];
    const chartPoint = {
      time: Math.floor(kline.startTime / 1000),
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
    };

    let updated;
    if (existing.length > 0 && existing[existing.length - 1].time === chartPoint.time) {
      // Update last candle
      updated = [...existing.slice(0, -1), chartPoint];
    } else {
      // New candle
      updated = [...existing, chartPoint];
      if (updated.length > MAX_KLINES) {
        updated.splice(0, updated.length - MAX_KLINES);
      }
    }

    return {
      klines: { ...state.klines, [symbol]: updated },
      lastMessageTime: Date.now(),
    };
  }),

  // === Selectors ===
  getCurrentTicker: () => {
    const { activeSymbol, tickers } = get();
    return tickers[activeSymbol] || null;
  },

  getCurrentTrades: () => {
    const { activeSymbol, trades } = get();
    return trades[activeSymbol] || [];
  },

  getCurrentOrderBook: () => {
    const { activeSymbol, orderBooks } = get();
    return orderBooks[activeSymbol] || null;
  },

  getCurrentKlines: () => {
    const { activeSymbol, klines } = get();
    return klines[activeSymbol] || [];
  },

  getPriceDirection: () => {
    const { activeSymbol, priceDirections } = get();
    return priceDirections[activeSymbol] || 'neutral';
  },

  reset: () => set({
    trades: {},
    tickers: {},
    orderBooks: {},
    klines: {},
    priceDirections: {},
    connectionStatus: 'connecting',
    lastMessageTime: 0,
  }),
}));
