import type { Candle } from '../candle';
import { calculateEMAFromValues } from './movingAverages';

export interface MACDPoint {
  time: number;
  macd: number;       // EMA(fast) - EMA(slow)
  signal: number;     // EMA(signalPeriod) of MACD line
  histogram: number;  // macd - signal
}

/**
 * MACD (Moving Average Convergence Divergence)
 *
 * 1. Calculate EMA(fastPeriod) and EMA(slowPeriod) of close prices
 * 2. MACD line = EMA(fast) - EMA(slow)
 * 3. Signal line = EMA(signalPeriod) of MACD line
 * 4. Histogram = MACD - Signal
 */
export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): MACDPoint[] {
  if (candles.length < slowPeriod + signalPeriod) return [];

  const closes = candles.map(c => c.close);

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMAFromValues(closes, fastPeriod);
  const slowEMA = calculateEMAFromValues(closes, slowPeriod);

  // Align: fast EMA starts at index (fastPeriod-1), slow at (slowPeriod-1)
  // MACD line starts where both exist: offset = slowPeriod - fastPeriod
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  // Signal line = EMA(signalPeriod) of MACD line
  const signalLine = calculateEMAFromValues(macdLine, signalPeriod);

  // Build result: signal starts signalPeriod-1 into the MACD line
  const result: MACDPoint[] = [];
  const macdStartIndex = slowPeriod - 1; // Candle index where MACD starts
  const signalOffset = signalPeriod - 1;

  for (let i = 0; i < signalLine.length; i++) {
    const candleIndex = macdStartIndex + signalOffset + i;
    const macdValue = macdLine[signalOffset + i];
    const signalValue = signalLine[i];

    result.push({
      time: candles[candleIndex].time,
      macd: macdValue,
      signal: signalValue,
      histogram: macdValue - signalValue,
    });
  }

  return result;
}
