import type { BinanceKlineRaw } from './types';
import { parseKlineRaw, type Candle } from '../engine/candle';

const BASE_URL = 'https://api.binance.com';

/** Fetch historical klines from Binance REST API */
export async function fetchKlines(
  symbol: string = 'BTCUSDT',
  interval: string = '1m',
  limit: number = 1000,
): Promise<Candle[]> {
  const url = `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance REST error: ${response.status} ${response.statusText}`);
  }
  const data: BinanceKlineRaw[] = await response.json();
  return data.map(parseKlineRaw);
}

/** Fetch multiple pages of klines for ML training (more than 1000 candles) */
export async function fetchKlinesMultiPage(
  symbol: string = 'BTCUSDT',
  interval: string = '1m',
  totalCandles: number = 2000,
): Promise<Candle[]> {
  const allCandles: Candle[] = [];
  let endTime: number | undefined;
  const pageSize = 1000;

  while (allCandles.length < totalCandles) {
    const remaining = totalCandles - allCandles.length;
    const limit = Math.min(remaining, pageSize);

    let url = `${BASE_URL}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    if (endTime) {
      url += `&endTime=${endTime}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance REST error: ${response.status} ${response.statusText}`);
    }

    const data: BinanceKlineRaw[] = await response.json();
    if (data.length === 0) break;

    const candles = data.map(parseKlineRaw);
    allCandles.unshift(...candles);

    // Set endTime to 1ms before the earliest candle for next page
    endTime = data[0][0] - 1;

    if (data.length < limit) break; // No more data available
  }

  // Sort by time ascending and deduplicate
  const seen = new Set<number>();
  return allCandles
    .sort((a, b) => a.time - b.time)
    .filter(c => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    });
}
