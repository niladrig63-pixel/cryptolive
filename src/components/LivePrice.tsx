import { useEffect, useRef, useState } from 'react';
import { useMarketStore } from '../store/marketStore';

export function LivePrice() {
  const currentCandle = useMarketStore(s => s.currentCandle);
  const candles = useMarketStore(s => s.candles);
  const prevPriceRef = useRef<number>(0);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  const price = currentCandle?.close ?? candles[candles.length - 1]?.close ?? 0;

  useEffect(() => {
    if (price === 0) return;
    if (price > prevPriceRef.current && prevPriceRef.current !== 0) {
      setFlash('up');
    } else if (price < prevPriceRef.current && prevPriceRef.current !== 0) {
      setFlash('down');
    }
    prevPriceRef.current = price;
    const timer = setTimeout(() => setFlash(null), 300);
    return () => clearTimeout(timer);
  }, [price]);

  const formatted = price > 0
    ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
    : '--';

  return (
    <div className="live-price card">
      <span className="live-price-label">BTC / USDT</span>
      <span className={`live-price-value ${flash ? `flash-${flash}` : ''}`}>
        {formatted}
      </span>
    </div>
  );
}
