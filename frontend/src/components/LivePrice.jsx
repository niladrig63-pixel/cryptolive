import React, { useRef, useEffect, useState } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { formatPrice, getSymbolDisplay } from '../utils/formatters';

const LivePrice = React.memo(function LivePrice() {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const ticker = useMarketStore((s) => s.tickers[s.activeSymbol]);
  const direction = useMarketStore((s) => s.priceDirections[s.activeSymbol] || 'neutral');
  const [flashClass, setFlashClass] = useState('');
  const prevPriceRef = useRef(null);

  const price = ticker?.lastPrice;

  useEffect(() => {
    if (price == null) return;
    if (prevPriceRef.current != null && price !== prevPriceRef.current) {
      const cls = price > prevPriceRef.current ? 'flash-green' : 'flash-red';
      setFlashClass(cls);
      const timer = setTimeout(() => setFlashClass(''), 500);
      prevPriceRef.current = price;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  const changePercent = ticker?.priceChangePercent;
  const priceChange = ticker?.priceChange;
  const isPositive = changePercent >= 0;

  return (
    <div className={`rounded-xl bg-bg-card border border-gray-700/50 p-6 ${flashClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-text-secondary">
          {getSymbolDisplay(activeSymbol)}
        </h2>
        <div className="flex items-center gap-1">
          {direction === 'up' && <span className="text-accent-green text-lg">&#9650;</span>}
          {direction === 'down' && <span className="text-accent-red text-lg">&#9660;</span>}
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <span className={`text-4xl font-bold font-mono tracking-tight ${
          isPositive ? 'text-accent-green' : 'text-accent-red'
        }`}>
          ${price != null ? formatPrice(price) : '—'}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2">
        {priceChange != null && (
          <span className={`text-sm font-mono ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
            {isPositive ? '+' : ''}{formatPrice(priceChange)}
          </span>
        )}
        {changePercent != null && (
          <span className={`text-sm font-mono px-2 py-0.5 rounded ${
            isPositive ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'
          }`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
});

export default LivePrice;
