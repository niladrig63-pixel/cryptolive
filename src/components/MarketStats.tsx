import { useMarketStore } from '../store/marketStore';
import { useMemo } from 'react';

export function MarketStats() {
  const candles = useMarketStore(s => s.candles);
  const currentCandle = useMarketStore(s => s.currentCandle);

  const stats = useMemo(() => {
    if (candles.length === 0) return null;

    const currentPrice = currentCandle?.close ?? candles[candles.length - 1]?.close ?? 0;

    // Use last 1440 candles (24 hours of 1m data) or all available
    const window = candles.slice(-1440);
    const high24h = Math.max(...window.map(c => c.high));
    const low24h = Math.min(...window.map(c => c.low));
    const volume24h = window.reduce((sum, c) => sum + c.volume, 0);
    const open24h = window[0]?.open ?? currentPrice;
    const change24h = open24h > 0 ? ((currentPrice - open24h) / open24h) * 100 : 0;

    return {
      currentPrice,
      high24h,
      low24h,
      volume24h,
      change24h,
    };
  }, [candles, currentCandle]);

  if (!stats) {
    return <div className="market-stats card loading">Loading stats...</div>;
  }

  const formatPrice = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatVolume = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
    return v.toFixed(2);
  };

  return (
    <div className="market-stats card">
      <div className="stat-item">
        <span className="stat-label">24h Change</span>
        <span className={`stat-value ${stats.change24h >= 0 ? 'positive' : 'negative'}`}>
          {stats.change24h >= 0 ? '+' : ''}{stats.change24h.toFixed(2)}%
        </span>
      </div>
      <div className="stat-item">
        <span className="stat-label">24h High</span>
        <span className="stat-value">${formatPrice(stats.high24h)}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">24h Low</span>
        <span className="stat-value">${formatPrice(stats.low24h)}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">24h Volume</span>
        <span className="stat-value">{formatVolume(stats.volume24h)} BTC</span>
      </div>
    </div>
  );
}
