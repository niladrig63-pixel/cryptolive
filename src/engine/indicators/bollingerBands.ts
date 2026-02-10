import type { Candle } from '../candle';

export interface BollingerBandPoint {
  time: number;
  upper: number;    // SMA + (stdDev * multiplier)
  middle: number;   // SMA
  lower: number;    // SMA - (stdDev * multiplier)
}

/**
 * Bollinger Bands
 *
 * 1. Calculate SMA(period) as the middle band
 * 2. Calculate standard deviation over the same window
 * 3. Upper = SMA + (multiplier * stdDev)
 * 4. Lower = SMA - (multiplier * stdDev)
 */
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  multiplier: number = 2,
): BollingerBandPoint[] {
  if (candles.length < period) return [];

  const result: BollingerBandPoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    // Calculate SMA for the window
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    const sma = sum / period;

    // Calculate standard deviation for the window
    let sqDiffSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j].close - sma;
      sqDiffSum += diff * diff;
    }
    const stdDev = Math.sqrt(sqDiffSum / period);

    result.push({
      time: candles[i].time,
      upper: sma + multiplier * stdDev,
      middle: sma,
      lower: sma - multiplier * stdDev,
    });
  }

  return result;
}
