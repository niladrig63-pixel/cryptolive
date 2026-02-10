/**
 * F.L.O.W. Market Engine — Layer 2: State Management
 * 
 * Pure deterministic data logic.
 * No I/O. No side effects. No UI logic.
 * 
 * Manages:
 * - Rolling windows for trades and klines
 * - Latest snapshots for ticker and order book
 * - Computed values (price direction, deltas)
 */

const MAX_TRADES = 500;
const MAX_KLINES = 200;

export class MarketState {
  constructor() {
    // Per-symbol state
    this.trades = new Map();       // symbol -> ParsedTrade[]
    this.tickers = new Map();      // symbol -> ParsedTicker
    this.orderBooks = new Map();   // symbol -> ParsedOrderBook
    this.klines = new Map();       // symbol -> ParsedKline[]
    this.priceDirections = new Map(); // symbol -> "up" | "down" | "neutral"
  }

  /**
   * Process incoming parsed data from StreamCore
   */
  handleData(data) {
    switch (data.type) {
      case 'trade': return this._handleTrade(data);
      case 'ticker': return this._handleTicker(data);
      case 'depth': return this._handleDepth(data);
      case 'kline': return this._handleKline(data);
      default: return null;
    }
  }

  _handleTrade(trade) {
    const { symbol } = trade;
    const trades = this.trades.get(symbol) || [];

    // Determine price direction
    const lastPrice = trades.length > 0 ? trades[trades.length - 1].price : trade.price;
    const direction = trade.price > lastPrice ? 'up' : trade.price < lastPrice ? 'down' : 'neutral';
    this.priceDirections.set(symbol, direction);

    // Append and bound
    trades.push(trade);
    if (trades.length > MAX_TRADES) {
      trades.splice(0, trades.length - MAX_TRADES);
    }
    this.trades.set(symbol, trades);

    return {
      type: 'trade',
      symbol,
      trade,
      direction,
      tradesCount: trades.length,
    };
  }

  _handleTicker(ticker) {
    const { symbol } = ticker;
    this.tickers.set(symbol, ticker);
    return {
      type: 'ticker',
      symbol,
      ticker,
    };
  }

  _handleDepth(depth) {
    const { symbol } = depth;
    this.orderBooks.set(symbol, depth);
    return {
      type: 'depth',
      symbol,
      depth,
    };
  }

  _handleKline(kline) {
    const { symbol } = kline;
    const klines = this.klines.get(symbol) || [];

    if (klines.length === 0) {
      klines.push(kline);
    } else {
      const last = klines[klines.length - 1];
      if (last.startTime === kline.startTime) {
        // Update existing candle in-place
        klines[klines.length - 1] = kline;
      } else {
        // New candle
        klines.push(kline);
        if (klines.length > MAX_KLINES) {
          klines.splice(0, klines.length - MAX_KLINES);
        }
      }
    }
    this.klines.set(symbol, klines);

    return {
      type: 'kline',
      symbol,
      kline,
      isClosed: kline.isClosed,
      klinesCount: klines.length,
    };
  }

  /**
   * Get current state for a symbol (used for initial snapshot on frontend connect)
   */
  getSnapshot(symbol) {
    const s = symbol.toUpperCase();
    return {
      trades: (this.trades.get(s) || []).slice(-50), // last 50 for initial load
      ticker: this.tickers.get(s) || null,
      orderBook: this.orderBooks.get(s) || null,
      klines: (this.klines.get(s) || []).map(k => ({
        time: Math.floor(k.startTime / 1000),
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
      })),
      priceDirection: this.priceDirections.get(s) || 'neutral',
    };
  }

  /**
   * Clear state for a symbol
   */
  clearSymbol(symbol) {
    const s = symbol.toUpperCase();
    this.trades.delete(s);
    this.tickers.delete(s);
    this.orderBooks.delete(s);
    this.klines.delete(s);
    this.priceDirections.delete(s);
  }

  /**
   * Get all tracked symbols
   */
  getSymbols() {
    const symbols = new Set([
      ...this.trades.keys(),
      ...this.tickers.keys(),
      ...this.orderBooks.keys(),
      ...this.klines.keys(),
    ]);
    return [...symbols];
  }
}
