import type { Candle, IndicatorPoint } from './candle';
import { calculateSMA, calculateEMA } from './indicators/movingAverages';
import { calculateRSI } from './indicators/rsi';
import { calculateMACD, type MACDPoint } from './indicators/macd';
import { calculateBollingerBands, type BollingerBandPoint } from './indicators/bollingerBands';

export interface IndicatorResults {
  sma20: IndicatorPoint[];
  ema12: IndicatorPoint[];
  ema26: IndicatorPoint[];
  rsi: IndicatorPoint[];
  macd: MACDPoint[];
  bollingerBands: BollingerBandPoint[];
}

/** Calculate all indicators for a given candle array */
export function calculateAllIndicators(candles: Candle[]): IndicatorResults {
  return {
    sma20: calculateSMA(candles, 20),
    ema12: calculateEMA(candles, 12),
    ema26: calculateEMA(candles, 26),
    rsi: calculateRSI(candles, 14),
    macd: calculateMACD(candles, 12, 26, 9),
    bollingerBands: calculateBollingerBands(candles, 20, 2),
  };
}
