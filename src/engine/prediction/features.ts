import type { Candle } from '../candle';
import type { IndicatorResults } from '../indicatorEngine';
import { normalize, computeNormParams, type NormalizationParams } from './normalize';

export interface FeatureVector {
  close: number;        // Normalized close price
  volume: number;       // Normalized volume
  rsi: number;          // RSI / 100 (already 0-1 range)
  macdHist: number;     // Normalized MACD histogram
  bbPosition: number;   // Position within Bollinger Bands: (close - lower) / (upper - lower)
}

export interface ExtractionResult {
  features: FeatureVector[];
  normParams: {
    close: NormalizationParams;
    volume: NormalizationParams;
    macdHist: NormalizationParams;
  };
}

/**
 * Extract feature vectors from candles + indicators.
 * Returns features aligned to the latest N candles (where all indicators have values).
 */
export function extractFeatures(
  candles: Candle[],
  indicators: IndicatorResults,
): ExtractionResult {
  // Find the common time window where all indicators have data
  const rsiTimes = new Map(indicators.rsi.map(p => [p.time, p.value]));
  const macdMap = new Map(indicators.macd.map(p => [p.time, p]));
  const bbMap = new Map(indicators.bollingerBands.map(p => [p.time, p]));

  // Filter candles to those where all indicators exist
  const aligned = candles.filter(c =>
    rsiTimes.has(c.time) && macdMap.has(c.time) && bbMap.has(c.time),
  );

  if (aligned.length === 0) {
    return {
      features: [],
      normParams: {
        close: { min: 0, max: 1 },
        volume: { min: 0, max: 1 },
        macdHist: { min: 0, max: 1 },
      },
    };
  }

  // Compute normalization params
  const closeParams = computeNormParams(aligned.map(c => c.close));
  const volumeParams = computeNormParams(aligned.map(c => c.volume));
  const macdHistValues = aligned.map(c => {
    const m = macdMap.get(c.time)!;
    return m.histogram;
  });
  const macdHistParams = computeNormParams(macdHistValues);

  // Generate feature vectors
  const features: FeatureVector[] = aligned.map(c => {
    const rsi = rsiTimes.get(c.time)!;
    const macd = macdMap.get(c.time)!;
    const bb = bbMap.get(c.time)!;

    const bbRange = bb.upper - bb.lower;
    const bbPosition = bbRange === 0 ? 0.5 : (c.close - bb.lower) / bbRange;

    return {
      close: normalize(c.close, closeParams),
      volume: normalize(c.volume, volumeParams),
      rsi: rsi / 100,
      macdHist: normalize(macd.histogram, macdHistParams),
      bbPosition: Math.max(0, Math.min(1, bbPosition)),
    };
  });

  return {
    features,
    normParams: {
      close: closeParams,
      volume: volumeParams,
      macdHist: macdHistParams,
    },
  };
}

/** Create sliding window training sequences from feature vectors */
export function createSlidingWindows(
  features: FeatureVector[],
  windowSize: number,
): { input: number[][]; output: number[] }[] {
  const sequences: { input: number[][]; output: number[] }[] = [];

  for (let i = 0; i <= features.length - windowSize - 1; i++) {
    const input: number[][] = [];
    for (let j = i; j < i + windowSize; j++) {
      const f = features[j];
      input.push([f.close, f.volume, f.rsi, f.macdHist, f.bbPosition]);
    }
    // Output: the close value of the next candle
    const output = [features[i + windowSize].close];
    sequences.push({ input, output });
  }

  return sequences;
}
