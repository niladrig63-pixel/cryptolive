import type { Candle, IndicatorPoint } from '../candle';

/** Simple Moving Average */
export function calculateSMA(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period) return [];

  const result: IndicatorPoint[] = [];
  let sum = 0;

  // Initialize first window
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  result.push({ time: candles[period - 1].time, value: sum / period });

  // Slide the window
  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    result.push({ time: candles[i].time, value: sum / period });
  }

  return result;
}

/** Exponential Moving Average */
export function calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period) return [];

  const multiplier = 2 / (period + 1);
  const result: IndicatorPoint[] = [];

  // First EMA value = SMA of first `period` candles
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;
  result.push({ time: candles[period - 1].time, value: ema });

  // Subsequent: EMA = close * multiplier + prevEMA * (1 - multiplier)
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * multiplier + ema * (1 - multiplier);
    result.push({ time: candles[i].time, value: ema });
  }

  return result;
}

/** Helper: Calculate EMA from a raw number array (used by MACD) */
export function calculateEMAFromValues(values: number[], period: number): number[] {
  if (values.length < period) return [];

  const multiplier = 2 / (period + 1);
  const result: number[] = [];

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let ema = sum / period;
  result.push(ema);

  for (let i = period; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
    result.push(ema);
  }

  return result;
}
