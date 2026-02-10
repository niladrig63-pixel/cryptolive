# F.L.O.W. Market Engine — State Flow

> Defines how data flows from WebSocket to UI, state mutation rules, and memory lifecycle.

---

## Architecture: 3-Layer Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                         │
│                                                             │
│  ┌───────────┐    ┌──────────────┐    ┌──────────────────┐ │
│  │ Binance   │───▶│ stream_core  │───▶│  market_state    │ │
│  │ WebSocket │    │ (parse +     │    │  (rolling window │ │
│  │           │    │  validate)   │    │   + persistence) │ │
│  └───────────┘    └──────────────┘    └────────┬─────────┘ │
│                                                │           │
│                         ┌──────────────────────┴────────┐  │
│                         │                               │  │
│                    ┌────▼─────┐              ┌──────────▼┐ │
│                    │ SQLite   │              │ WS Server │ │
│                    │ (persist)│              │ (relay)   │ │
│                    └──────────┘              └─────┬─────┘ │
└───────────────────────────────────────────────────┼────────┘
                                                    │
┌───────────────────────────────────────────────────┼────────┐
│                    FRONTEND (React)               │        │
│                                                   │        │
│  ┌────────────────┐    ┌──────────────────────┐   │        │
│  │ useWebSocket   │◀───│  Backend WS Server   │◀──┘        │
│  │ (hook)         │    └──────────────────────┘            │
│  └───────┬────────┘                                        │
│          │ dispatch                                         │
│  ┌───────▼────────┐                                        │
│  │ Zustand Store  │                                        │
│  │ ┌────────────┐ │    ┌──────────────────────┐            │
│  │ │ trades     │─┼───▶│ <LivePrice />        │            │
│  │ │ tickers    │─┼───▶│ <MarketStats />      │            │
│  │ │ orderBooks │─┼───▶│ <OrderBook />        │            │
│  │ │ klines     │─┼───▶│ <PriceChart />       │            │
│  │ │ connection │─┼───▶│ <ConnectionStatus /> │            │
│  │ └────────────┘ │    └──────────────────────┘            │
│  └────────────────┘                                        │
└────────────────────────────────────────────────────────────┘
```

---

## Backend State Rules

### stream_core.js (Layer 1)

**Responsibilities:**
- Maintain single combined WebSocket connection to Binance
- Handle ping/pong automatically (ws library)
- Parse raw JSON into typed objects
- Validate payload against expected schema
- Emit parsed events to market_state

**Reconnect Logic:**
```
Disconnect detected
  → Wait: min(1000 * 2^attempt, 30000) ms
  → Attempt reconnect
  → On success: reset attempt counter, resubscribe all streams
  → On failure: increment attempt, retry
  → 24hr auto-reconnect: proactive reconnect at 23h 50m
```

**Subscription Management:**
```
addSymbol(symbol)
  → Build stream list: [trade, ticker, depth20@100ms, kline_1m]
  → Send SUBSCRIBE message
  → Track in activeSubscriptions Set

removeSymbol(symbol)
  → Send UNSUBSCRIBE message
  → Remove from activeSubscriptions Set
  → Clear state for symbol
```

### market_state.js (Layer 2)

**Pure deterministic state logic. No I/O. No side effects.**

**Rolling Window Rules:**

| Data Type   | Window Size | Eviction Policy        |
| ----------- | ----------- | ---------------------- |
| Trades      | 500         | Drop oldest on overflow|
| Klines      | 200         | Drop oldest on overflow|
| Order Book  | 1 snapshot  | Replace entirely       |
| Ticker      | 1 snapshot  | Replace entirely       |

**State Mutation Contract:**
```
Every mutation MUST:
  1. Be immutable (new object, not in-place mutation)
  2. Be bounded (never exceed window size)
  3. Be idempotent (same input → same output)
  4. Return new state object

FORBIDDEN:
  - Direct array mutation (push/splice on existing)
  - Unbounded growth
  - Side effects (no DB writes, no WS sends)
```

**Computed Values (derived, not stored):**
```
From trades:
  - priceDirection: compare lastTrade.price vs previousTrade.price
  - avgTradeSize: sum(quantities) / trades.length

From klines:
  - priceChange24h: current close - first open in window
  - volumeMA: moving average of volume over N candles

From orderBook:
  - spread: asks[0].price - bids[0].price
  - imbalance: sum(bid_qty) / (sum(bid_qty) + sum(ask_qty))
```

---

## Frontend State Rules

### Zustand Store Structure

```typescript
interface MarketStore {
  // === Connection ===
  connectionStatus: "connecting" | "connected" | "disconnected" | "reconnecting";
  reconnectAttempts: number;
  lastMessageTime: number;

  // === Active Symbol ===
  activeSymbol: string;         // "btcusdt"
  availableSymbols: string[];   // ["btcusdt", "ethusdt", ...]

  // === Market Data (per symbol) ===
  trades: Map<string, ParsedTrade[]>;
  tickers: Map<string, ParsedTicker>;
  orderBooks: Map<string, ParsedOrderBook>;
  klines: Map<string, ParsedKline[]>;

  // === Derived (selectors, not stored) ===
  // getCurrentTicker(): ParsedTicker | null
  // getCurrentTrades(): ParsedTrade[]
  // getCurrentOrderBook(): ParsedOrderBook | null
  // getCurrentKlines(): CandlestickData[]

  // === Actions ===
  setActiveSymbol: (symbol: string) => void;
  handleTradeMessage: (trade: ParsedTrade) => void;
  handleTickerMessage: (ticker: ParsedTicker) => void;
  handleOrderBookMessage: (book: ParsedOrderBook) => void;
  handleKlineMessage: (kline: ParsedKline) => void;
  setConnectionStatus: (status: string) => void;
  reset: () => void;
}
```

### Update Rules

**Trade Messages:**
```
1. Append to trades[symbol] array
2. If trades[symbol].length > 500, slice to keep last 500
3. Update priceDirection by comparing with previous last trade
4. Trigger re-render of <LivePrice /> and trade feed
```

**Ticker Messages:**
```
1. Replace tickers[symbol] entirely
2. No history needed (always latest snapshot)
3. Trigger re-render of <MarketStats />
```

**Order Book Messages:**
```
1. Replace orderBooks[symbol] entirely
2. Compute cumulative totals for depth chart
3. Trigger re-render of <OrderBook />
```

**Kline Messages:**
```
1. If kline.isClosed === false:
   → Update last element in klines[symbol] in-place
2. If kline.isClosed === true:
   → Push new candle to klines[symbol]
   → If length > 200, slice to keep last 200
3. Trigger re-render of <PriceChart />
```

---

## Re-render Optimization Strategy

```
1. Zustand selectors: Components subscribe to ONLY their slice
   - <LivePrice /> subscribes to trades[activeSymbol] last element
   - <PriceChart /> subscribes to klines[activeSymbol]
   - <OrderBook /> subscribes to orderBooks[activeSymbol]
   - <MarketStats /> subscribes to tickers[activeSymbol]

2. Chart throttling:
   - Kline chart: update max every 500ms (requestAnimationFrame)
   - Depth chart: update max every 200ms
   - Trade feed: batch updates every 100ms

3. Memoization:
   - React.memo on all heavy components
   - useMemo for derived calculations
   - useCallback for event handlers
```

---

## Symbol Switch Flow

```
User selects new symbol (e.g., ethusdt)
  → Frontend: setActiveSymbol("ethusdt")
  → Frontend: Send message to backend: { type: "switch", symbol: "ethusdt" }
  → Backend: UNSUBSCRIBE old symbol streams
  → Backend: SUBSCRIBE new symbol streams
  → Backend: Load historical klines from SQLite for new symbol
  → Backend: Send historical data snapshot to frontend
  → Frontend: Replace state for new symbol
  → Frontend: UI re-renders with new data
```

---

## Error States

| Error                    | Detection                      | Recovery                           |
| ------------------------ | ------------------------------ | ---------------------------------- |
| WS disconnect            | `onclose` event                | Exponential backoff reconnect      |
| Invalid payload          | Zod validation fail            | Log + skip message, don't crash    |
| Backend unreachable      | Frontend WS `onerror`          | Show status indicator, auto-retry  |
| Stale data               | No message for 30s             | Show "stale" warning badge         |
| Memory overflow          | trades.length > 500            | Auto-evict oldest entries          |
| 24hr disconnect          | Timer at 23h 50m               | Proactive graceful reconnect       |

---

## Persistence Strategy (Backend SQLite)

### Tables

```sql
-- Store completed klines for historical chart
CREATE TABLE klines (
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
);

-- Store recent trades for historical feed
CREATE TABLE trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  trade_id INTEGER NOT NULL,
  price REAL NOT NULL,
  quantity REAL NOT NULL,
  time INTEGER NOT NULL,
  is_buyer_maker BOOLEAN NOT NULL,
  UNIQUE(symbol, trade_id)
);

-- Indexes
CREATE INDEX idx_klines_symbol_time ON klines(symbol, interval, open_time);
CREATE INDEX idx_trades_symbol_time ON trades(symbol, time);
```

### Write Rules
- Only persist **closed** klines (`isClosed === true`)
- Persist trades in batches (every 100 trades or 5 seconds)
- Use INSERT OR IGNORE to handle duplicates
- Prune trades older than 24 hours daily

### Read Rules (REST API)
- `GET /api/klines?symbol=btcusdt&interval=1m&limit=200` → Historical klines
- `GET /api/trades?symbol=btcusdt&limit=500` → Recent trades
- Used on initial load and symbol switch
