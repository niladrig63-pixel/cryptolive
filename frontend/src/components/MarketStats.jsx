import React from 'react';
import { useMarketStore } from '../stores/marketStore';
import { formatPrice, formatVolume } from '../utils/formatters';

const MarketStats = React.memo(function MarketStats() {
  const ticker = useMarketStore((s) => s.tickers[s.activeSymbol]);
  const orderBook = useMarketStore((s) => s.orderBooks[s.activeSymbol]);

  if (!ticker) {
    return (
      <div className="rounded-xl bg-bg-card border border-gray-700/50 p-4">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Market Stats</h3>
        <div className="text-text-muted text-sm">Waiting for data...</div>
      </div>
    );
  }

  const stats = [
    { label: '24h High', value: formatPrice(ticker.highPrice), color: 'text-accent-green' },
    { label: '24h Low', value: formatPrice(ticker.lowPrice), color: 'text-accent-red' },
    { label: '24h Volume', value: formatVolume(ticker.volume), color: 'text-text-primary' },
    { label: 'Quote Vol', value: formatVolume(ticker.quoteVolume), color: 'text-text-primary' },
    { label: 'VWAP', value: formatPrice(ticker.weightedAvgPrice), color: 'text-accent-cyan' },
    { label: 'Trades', value: ticker.trades?.toLocaleString() || '—', color: 'text-text-primary' },
    { label: 'Best Bid', value: formatPrice(ticker.bestBid), color: 'text-accent-green' },
    { label: 'Best Ask', value: formatPrice(ticker.bestAsk), color: 'text-accent-red' },
  ];

  if (orderBook) {
    stats.push(
      { label: 'Spread', value: formatPrice(orderBook.spread), color: 'text-accent-yellow' },
      { label: 'Spread %', value: orderBook.spreadPercent?.toFixed(4) + '%', color: 'text-accent-yellow' },
    );
  }

  return (
    <div className="rounded-xl bg-bg-card border border-gray-700/50 p-4">
      <h3 className="text-sm font-semibold text-text-secondary mb-3">Market Stats</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex justify-between items-center">
            <span className="text-xs text-text-muted">{s.label}</span>
            <span className={`text-xs font-mono ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default MarketStats;
