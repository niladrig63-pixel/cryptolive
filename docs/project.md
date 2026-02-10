# F.L.O.W. Market Engine — Project Constitution

## Primary Objective

Build a **production-grade, real-time crypto trading dashboard** that streams live market data from Binance via WebSocket, displays it through an interactive React UI with professional charting, persists historical data, and deploys via Docker.

---

## Selected Exchange / API

| Property          | Value                                            |
| ----------------- | ------------------------------------------------ |
| Exchange          | **Binance** (Spot Market)                        |
| Auth Required     | No (public market streams)                       |
| Base WS Endpoint  | `wss://stream.binance.com:9443`                  |
| Raw Stream URL    | `/ws/<streamName>`                               |
| Combined URL      | `/stream?streams=<s1>/<s2>/<s3>`                 |
| REST API Base     | `https://api.binance.com/api/v3`                 |

---

## WebSocket Streams (4 Active)

| Stream             | Name Pattern                      | Update Speed | Purpose              |
| ------------------ | --------------------------------- | ------------ | -------------------- |
| **Trade**          | `<symbol>@trade`                  | Real-time    | Live price & volume  |
| **Ticker (24hr)**  | `<symbol>@ticker`                 | 1000ms       | 24hr stats, bid/ask  |
| **Order Book**     | `<symbol>@depth20@100ms`          | 100ms        | Top 20 depth levels  |
| **Kline (1m)**     | `<symbol>@kline_1m`              | 2000ms       | Candlestick chart    |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Binance WS API                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Node.js Backend Server                  │
│  ┌─────────────────────────────────────────────┐    │
│  │  WebSocket Client → Binance Streams         │    │
│  │  Data Parser & Validator                    │    │
│  │  SQLite Database (historical persistence)   │    │
│  │  REST API (GET /api/history, /api/klines)   │    │
│  │  WebSocket Server → Relay to Frontend       │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              React Frontend (Vite)                   │
│  ┌─────────────────────────────────────────────┐    │
│  │  WebSocket Client → Backend WS Server       │    │
│  │  Zustand State Store                        │    │
│  │  TradingView Lightweight Charts             │    │
│  │  Modular UI Components                      │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Component        | Technology                        |
| ---------------- | --------------------------------- |
| Runtime          | Node.js 20 LTS                    |
| WebSocket Client | `ws` library                      |
| WebSocket Server | `ws` library                      |
| HTTP Server      | Express.js                        |
| Database         | SQLite via `better-sqlite3`       |
| Validation       | Zod                               |

### Frontend
| Component        | Technology                        |
| ---------------- | --------------------------------- |
| Framework        | React 18                          |
| Build Tool       | Vite 5                            |
| State Management | Zustand                           |
| Charting         | TradingView Lightweight Charts    |
| Styling          | Tailwind CSS                      |
| Animations       | Framer Motion                     |

### Infrastructure
| Component        | Technology                        |
| ---------------- | --------------------------------- |
| Container        | Docker + Docker Compose           |
| Backend Port     | 4000                              |
| Frontend Port    | 5173 (dev) / 80 (prod via nginx)  |

---

## Deployment Target

**Docker Compose** — multi-container setup:
- `backend` container: Node.js server + SQLite volume
- `frontend` container: Nginx serving Vite build

---

## Performance Expectations

| Metric                  | Target                             |
| ----------------------- | ---------------------------------- |
| Trade stream latency    | < 100ms from Binance to UI render  |
| UI update frequency     | Throttled to 60fps max             |
| Chart update frequency  | Kline: 2s, Depth: 100ms           |
| Rolling window size     | 500 trades, 200 klines, 20 depth  |
| Memory ceiling          | Backend < 256MB, Frontend < 128MB  |
| Reconnect strategy      | Exponential backoff: 1s→2s→4s→30s |
| Max reconnect attempts  | Unlimited (with backoff ceiling)   |

---

## Constraints

- No API key required (public streams only)
- Single connection limit: 1024 streams per connection
- Binance WS rate limit: 5 incoming messages/sec
- Connection auto-disconnects after 24 hours (must auto-reconnect)
- Binance sends ping every 20s; must respond with pong within 60s

---

## Default Trading Pairs

| Priority | Symbol      | Display Name     |
| -------- | ----------- | ---------------- |
| 1        | btcusdt     | BTC/USDT         |
| 2        | ethusdt     | ETH/USDT         |
| 3        | bnbusdt     | BNB/USDT         |
| 4        | solusdt     | SOL/USDT         |
| 5        | xrpusdt     | XRP/USDT         |

---

## Folder Structure (Planned)

```
crytoLive/
├── docs/                     # Protocol documentation
│   ├── project.md
│   ├── stream_schema.md
│   ├── state_flow.md
│   └── progress.md
├── backend/
│   ├── src/
│   │   ├── index.js          # Entry point
│   │   ├── stream_core.js    # Layer 1: Binance WS client
│   │   ├── market_state.js   # Layer 2: State management
│   │   ├── db.js             # SQLite persistence
│   │   ├── api.js            # REST endpoints
│   │   └── ws_server.js      # WS relay to frontend
│   ├── tests/
│   │   └── stream_test.js    # Phase 2: Connection validation
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── stores/           # Zustand stores
│   │   ├── components/       # React UI components
│   │   ├── hooks/            # Custom hooks
│   │   └── utils/            # Helpers
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
