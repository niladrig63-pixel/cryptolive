import React, { useCallback } from 'react';
import { useMarketStore } from './stores/marketStore';
import { switchSymbol } from './services/websocket';
import ConnectionStatus from './components/ConnectionStatus';
import AssetSelector from './components/AssetSelector';
import LivePrice from './components/LivePrice';
import PriceChart from './components/PriceChart';
import OrderBook from './components/OrderBook';
import MarketStats from './components/MarketStats';
import TradeFeed from './components/TradeFeed';

export default function App() {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);

  const handleSymbolSwitch = useCallback((symbol) => {
    switchSymbol(symbol);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary p-4 lg:p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-tight">
            <span className="text-accent-blue">Crypto</span>Live
          </h1>
          <ConnectionStatus />
        </div>
        <div className="text-xs text-text-muted font-mono">
          F.L.O.W. Market Engine
        </div>
      </header>

      {/* Asset Selector */}
      <div className="mb-6">
        <AssetSelector onSwitch={handleSymbolSwitch} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Price + Chart */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <LivePrice />
          <PriceChart />
        </div>

        {/* Right Column: Stats + Order Book + Trades */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <MarketStats />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 flex-1">
            <div className="min-h-[300px]">
              <OrderBook />
            </div>
            <div className="min-h-[300px]">
              <TradeFeed />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-gray-800 text-center">
        <p className="text-xs text-text-muted">
          Real-time data from Binance WebSocket API &mdash; Built with React + TradingView Lightweight Charts
        </p>
      </footer>
    </div>
  );
}
