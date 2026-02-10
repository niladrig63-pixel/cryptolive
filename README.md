# CryptoLive — Real-Time Trading Dashboard

A production-grade, real-time cryptocurrency trading dashboard built with the **F.L.O.W. Market Engine** protocol.

![Architecture](docs/architecture.png)

## Features

- **Live Price Streaming** — Real-time trade data from Binance WebSocket
- **Candlestick Chart** — TradingView Lightweight Charts with 1-minute candles
- **Order Book** — Top 20 bid/ask levels with depth visualization
- **Market Stats** — 24hr stats, VWAP, spread, volume
- **Multi-Asset** — Switch between BTC, ETH, BNB, SOL, XRP
- **Trade Feed** — Live scrolling trade history
- **Historical Persistence** — SQLite stores completed klines and trades
- **Auto-Reconnect** — Exponential backoff with proactive 24hr reconnection
- **Dark Trading Theme** — Professional UI with green/red flash animations

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Backend   | Node.js 20, Express, ws, sql.js, Zod   |
| Frontend  | React 18, Vite 5, Zustand, Tailwind    |
| Charting  | TradingView Lightweight Charts          |
| Database  | SQLite (via sql.js, pure JS)            |
| Deploy    | Docker + Docker Compose                 |

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- npm 9+

### 1. Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend starts on `http://localhost:4000`

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:5173`

Vite proxies `/api` and `/ws` to the backend automatically.

## Docker Deployment

```bash
docker-compose up --build
```

- Frontend: `http://localhost`
- Backend API: `http://localhost:4000/api/health`

## Architecture

```
Binance WebSocket API
        │
        ▼
┌──────────────────────┐
│   Backend (Node.js)  │
│  ├─ stream_core.js   │  ← Binance WS client + reconnect
│  ├─ market_state.js  │  ← State management + rolling windows
│  ├─ db.js            │  ← SQLite persistence
│  ├─ api.js           │  ← REST API for historical data
│  └─ ws_server.js     │  ← WS relay to frontend clients
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Frontend (React)    │
│  ├─ Zustand Store    │  ← Central state (trades, tickers, klines, depth)
│  ├─ useWebSocket     │  ← WS hook (connect, reconnect, dispatch)
│  ├─ PriceChart       │  ← TradingView Lightweight Charts
│  ├─ OrderBook        │  ← Depth visualization
│  ├─ LivePrice        │  ← Real-time price with flash animations
│  ├─ MarketStats      │  ← 24hr statistics
│  ├─ TradeFeed        │  ← Live trade scroll
│  └─ AssetSelector    │  ← Multi-asset switching
└──────────────────────┘
```

## Data Flow

```
Binance WS → stream_core.js (parse) → market_state.js (store)
                                            │
                                    ┌───────┴───────┐
                                    │               │
                                 SQLite       WS Server
                              (persist)      (relay to UI)
                                                │
                                          Zustand Store
                                                │
                                        React Components
```

## API Endpoints

| Method | Endpoint                                   | Description              |
| ------ | ------------------------------------------ | ------------------------ |
| GET    | `/api/health`                              | Health check             |
| GET    | `/api/klines?symbol=BTCUSDT&limit=200`     | Historical klines        |
| GET    | `/api/trades?symbol=BTCUSDT&limit=500`     | Historical trades        |
| GET    | `/api/snapshot/:symbol`                    | Current state snapshot   |
| GET    | `/api/symbols`                             | Active symbols list      |

## WebSocket Messages (Frontend ↔ Backend)

### Client → Server
```json
{ "type": "switch", "symbol": "ETHUSDT" }
{ "type": "subscribe", "symbol": "SOLUSDT" }
{ "type": "unsubscribe", "symbol": "SOLUSDT" }
{ "type": "ping" }
```

### Server → Client
```json
{ "type": "snapshot", "symbol": "BTCUSDT", "data": {...} }
{ "type": "trade", "symbol": "BTCUSDT", "trade": {...}, "direction": "up" }
{ "type": "ticker", "symbol": "BTCUSDT", "ticker": {...} }
{ "type": "depth", "symbol": "BTCUSDT", "depth": {...} }
{ "type": "kline", "symbol": "BTCUSDT", "kline": {...} }
{ "type": "status", "status": "connected" }
{ "type": "pong", "timestamp": 1234567890 }
```

## Project Structure

```
crytoLive/
├── docs/                         # F.L.O.W. protocol documentation
│   ├── project.md                # Architecture & constraints
│   ├── stream_schema.md          # Binance WS payload schemas
│   ├── state_flow.md             # Frontend/backend state flow
│   └── progress.md               # Phase tracker
├── backend/
│   ├── src/
│   │   ├── index.js              # Entry point (orchestrator)
│   │   ├── stream_core.js        # Layer 1: Binance WS client
│   │   ├── market_state.js       # Layer 2: State management
│   │   ├── db.js                 # SQLite persistence
│   │   ├── api.js                # REST API
│   │   └── ws_server.js          # WS relay server
│   ├── tests/
│   │   └── stream_test.js        # Stream validation test
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main layout
│   │   ├── main.jsx              # Entry point
│   │   ├── index.css             # Global styles
│   │   ├── stores/
│   │   │   └── marketStore.js    # Zustand store
│   │   ├── hooks/
│   │   │   └── useWebSocket.js   # WS connection hook
│   │   ├── components/
│   │   │   ├── LivePrice.jsx
│   │   │   ├── PriceChart.jsx
│   │   │   ├── OrderBook.jsx
│   │   │   ├── MarketStats.jsx
│   │   │   ├── TradeFeed.jsx
│   │   │   ├── AssetSelector.jsx
│   │   │   └── ConnectionStatus.jsx
│   │   └── utils/
│   │       └── formatters.js
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## License

MIT
