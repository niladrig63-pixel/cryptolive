import { useEffect, useRef } from 'react';
import { calculateAllIndicators } from '../engine/indicatorEngine';
import { useMarketStore } from '../store/marketStore';

export function useIndicators() {
  const candles = useMarketStore(s => s.candles);
  const setIndicators = useMarketStore(s => s.setIndicators);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    // Only recalculate when candles array length changes (new candle closed)
    if (candles.length === prevLengthRef.current) return;
    prevLengthRef.current = candles.length;

    if (candles.length < 35) return; // Need minimum data for MACD (26+9)

    const results = calculateAllIndicators(candles);
    setIndicators(results);
  }, [candles, setIndicators]);
}
