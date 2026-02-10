# F.L.O.W. Market Engine — Stream Schema

> All schemas verified against official Binance WebSocket API documentation.
> Last verified: 2026-02-10

---

## Connection Details

```
Base Endpoint: wss://stream.binance.com:9443
Combined URL:  wss://stream.binance.com:9443/stream?streams=<s1>/<s2>/<s3>

Combined stream wrapper:
{
  "stream": "<streamName>",
  "data": <rawPayload>
}
```

### Subscribe/Unsubscribe (Dynamic)
```json
{
  "method": "SUBSCRIBE",
  "params": ["btcusdt@trade", "btcusdt@ticker"],
  "id": 1
}
```

---

## Stream 1: Trade (`<symbol>@trade`)

**Update Speed:** Real-time

### Raw Incoming Payload
```json
{
  "e": "trade",           // Event type
  "E": 1672515782136,     // Event time (ms)
  "s": "BNBBTC",          // Symbol
  "t": 12345,             // Trade ID
  "p": "0.001",           // Price (string)
  "q": "100",             // Quantity (string)
  "T": 1672515782136,     // Trade time (ms)
  "m": true,              // Is buyer the market maker?
  "M": true               // Ignore
}
```

### Parsed Data Shape
```typescript
interface ParsedTrade {
  type: "trade";
  symbol: string;         // "BTCUSDT"
  tradeId: number;
  price: number;          // parseFloat(p)
  quantity: number;        // parseFloat(q)
  total: number;          // price * quantity
  time: number;           // T (trade time ms)
  isBuyerMaker: boolean;  // m
  side: "sell" | "buy";   // m ? "sell" : "buy"
}
```

### State Storage Shape
```typescript
interface TradeState {
  trades: ParsedTrade[];       // Rolling window, max 500
  lastTrade: ParsedTrade | null;
  lastPrice: number;
  priceDirection: "up" | "down" | "neutral";
}
```

### Chart-Compatible Shape
```typescript
// For trade scatter/tick chart
interface TradeChartPoint {
  time: number;     // Unix seconds (T / 1000)
  value: number;    // price
  color: string;    // green for buy, red for sell
}
```

---

## Stream 2: Ticker (`<symbol>@ticker`)

**Update Speed:** 1000ms

### Raw Incoming Payload
```json
{
  "e": "24hrTicker",      // Event type
  "E": 1672515782136,     // Event time (ms)
  "s": "BNBBTC",          // Symbol
  "p": "0.0015",          // Price change
  "P": "250.00",          // Price change percent
  "w": "0.0018",          // Weighted average price
  "x": "0.0009",          // First trade(F)-1 price
  "c": "0.0025",          // Last price
  "Q": "10",              // Last quantity
  "b": "0.0024",          // Best bid price
  "B": "10",              // Best bid quantity
  "a": "0.0026",          // Best ask price
  "A": "100",             // Best ask quantity
  "o": "0.0010",          // Open price
  "h": "0.0025",          // High price
  "l": "0.0010",          // Low price
  "v": "10000",           // Total traded base asset volume
  "q": "18",              // Total traded quote asset volume
  "O": 0,                 // Statistics open time
  "C": 86400000,          // Statistics close time
  "F": 0,                 // First trade ID
  "L": 18150,             // Last trade ID
  "n": 18151              // Total number of trades
}
```

### Parsed Data Shape
```typescript
interface ParsedTicker {
  type: "ticker";
  symbol: string;
  lastPrice: number;           // parseFloat(c)
  priceChange: number;         // parseFloat(p)
  priceChangePercent: number;  // parseFloat(P)
  weightedAvgPrice: number;    // parseFloat(w)
  highPrice: number;           // parseFloat(h)
  lowPrice: number;            // parseFloat(l)
  openPrice: number;           // parseFloat(o)
  volume: number;              // parseFloat(v)
  quoteVolume: number;         // parseFloat(q)
  bestBid: number;             // parseFloat(b)
  bestBidQty: number;          // parseFloat(B)
  bestAsk: number;             // parseFloat(a)
  bestAskQty: number;          // parseFloat(A)
  trades: number;              // n
  eventTime: number;           // E
}
```

### State Storage Shape
```typescript
interface TickerState {
  tickers: Map<string, ParsedTicker>;  // symbol -> latest ticker
}
```

### UI Display Shape
```typescript
interface TickerDisplay {
  symbol: string;
  price: string;            // formatted with decimals
  change: string;           // "+0.0015"
  changePercent: string;    // "+250.00%"
  high: string;
  low: string;
  volume: string;           // abbreviated "1.2B"
  spread: string;           // ask - bid
  direction: "up" | "down" | "neutral";
}
```

---

## Stream 3: Partial Book Depth (`<symbol>@depth20@100ms`)

**Update Speed:** 100ms
**Levels:** Top 20 bids and asks

### Raw Incoming Payload
```json
{
  "lastUpdateId": 160,
  "bids": [
    ["0.0024", "10"],      // [price, quantity]
    ["0.0023", "20"]
  ],
  "asks": [
    ["0.0026", "100"],     // [price, quantity]
    ["0.0027", "50"]
  ]
}
```

### Parsed Data Shape
```typescript
interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;        // cumulative quantity from top
}

interface ParsedOrderBook {
  type: "depth";
  symbol: string;
  lastUpdateId: number;
  bids: OrderBookLevel[];   // sorted descending by price
  asks: OrderBookLevel[];   // sorted ascending by price
  spread: number;           // asks[0].price - bids[0].price
  spreadPercent: number;    // spread / midPrice * 100
  midPrice: number;         // (bids[0].price + asks[0].price) / 2
  timestamp: number;        // Date.now() at parse time
}
```

### State Storage Shape
```typescript
interface OrderBookState {
  books: Map<string, ParsedOrderBook>;  // symbol -> latest book
}
```

### Chart-Compatible Shape
```typescript
// For depth visualization
interface DepthChartData {
  bids: { price: number; cumulative: number }[];
  asks: { price: number; cumulative: number }[];
}
```

---

## Stream 4: Kline/Candlestick (`<symbol>@kline_1m`)

**Update Speed:** 2000ms
**Default Interval:** 1m

### Raw Incoming Payload
```json
{
  "e": "kline",
  "E": 1672515782136,         // Event time
  "s": "BNBBTC",              // Symbol
  "k": {
    "t": 1672515780000,       // Kline start time
    "T": 1672515839999,       // Kline close time
    "s": "BNBBTC",            // Symbol
    "i": "1m",                // Interval
    "f": 100,                 // First trade ID
    "L": 200,                 // Last trade ID
    "o": "0.0010",            // Open price
    "c": "0.0020",            // Close price
    "h": "0.0025",            // High price
    "l": "0.0015",            // Low price
    "v": "1000",              // Base asset volume
    "n": 100,                 // Number of trades
    "x": false,               // Is this kline closed?
    "q": "1.0000",            // Quote asset volume
    "V": "500",               // Taker buy base asset volume
    "Q": "0.500",             // Taker buy quote asset volume
    "B": "123456"             // Ignore
  }
}
```

### Parsed Data Shape
```typescript
interface ParsedKline {
  type: "kline";
  symbol: string;
  interval: string;       // "1m"
  startTime: number;      // k.t
  closeTime: number;      // k.T
  open: number;           // parseFloat(k.o)
  close: number;          // parseFloat(k.c)
  high: number;           // parseFloat(k.h)
  low: number;            // parseFloat(k.l)
  volume: number;         // parseFloat(k.v)
  quoteVolume: number;    // parseFloat(k.q)
  trades: number;         // k.n
  isClosed: boolean;      // k.x
  takerBuyVolume: number; // parseFloat(k.V)
}
```

### State Storage Shape
```typescript
interface KlineState {
  klines: Map<string, ParsedKline[]>;  // symbol -> kline array
  // Max 200 klines per symbol
  // When kline.isClosed === true, push new candle
  // When kline.isClosed === false, update last candle in-place
}
```

### Chart-Compatible Shape (TradingView Lightweight Charts)
```typescript
interface CandlestickData {
  time: number;    // Unix timestamp in SECONDS (startTime / 1000)
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: number;
  value: number;          // volume
  color: string;          // green if close >= open, red otherwise
}
```

---

## Data Transformation Pipeline

```
┌──────────────────────────────┐
│   Binance WebSocket Message  │  Raw JSON string
└──────────────┬───────────────┘
               │ JSON.parse()
┌──────────────▼───────────────┐
│   Raw Incoming Payload       │  Binance's original shape
└──────────────┬───────────────┘
               │ Parser functions (per stream type)
┌──────────────▼───────────────┐
│   Parsed Data Shape          │  Clean, typed, numeric
└──────────────┬───────────────┘
               │ State manager (rolling window, dedup)
┌──────────────▼───────────────┐
│   State Storage Shape        │  Bounded arrays/maps
└──────────────┬───────────────┘
               │ Selector/transform for rendering
┌──────────────▼───────────────┐
│   Chart-Compatible Shape     │  Ready for TradingView / UI
└──────────────────────────────┘
```

---

## Binance Connection Rules

| Rule                          | Detail                                    |
| ----------------------------- | ----------------------------------------- |
| Max streams per connection    | 1024                                      |
| Incoming msg rate limit       | 5 per second                              |
| Connection lifetime           | 24 hours (auto-disconnect)                |
| Ping interval (from server)   | Every 20 seconds                          |
| Pong response deadline        | 60 seconds                                |
| Symbol format                 | Lowercase (`btcusdt`, not `BTCUSDT`)      |
| Combined stream wrapper       | `{ "stream": "...", "data": {...} }`      |
| Timestamps                    | Milliseconds by default                   |
| Reconnect on disconnect       | Mandatory with exponential backoff        |
