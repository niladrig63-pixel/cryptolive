import { useEffect } from 'react';
import { fetchKlines } from '../api/binanceRest';
import { useMarketStore } from '../store/marketStore';

export function useHistoricalData() {
  const initializeCandles = useMarketStore(s => s.initializeCandles);

  useEffect(() => {
    let cancelled = false;

    fetchKlines('BTCUSDT', '1m', 1000)
      .then(candles => {
        if (!cancelled) {
          initializeCandles(candles);
        }
      })
      .catch(err => {
        console.error('Failed to fetch historical data:', err);
      });

    return () => { cancelled = true; };
  }, [initializeCandles]);
}
