import { create } from 'zustand';
import type { Candle } from '../engine/candle';
import type { IndicatorResults } from '../engine/indicatorEngine';
import type { PredictionResult } from '../engine/prediction/model';
import type { ConnectionStatus } from '../api/types';

const MAX_CANDLES = 1500;

interface MarketState {
  // Connection
  connectionStatus: ConnectionStatus;

  // Candle data
  candles: Candle[];
  currentCandle: Candle | null;

  // Indicators
  indicators: IndicatorResults | null;

  // Prediction
  prediction: PredictionResult | null;
  isModelTrained: boolean;
  isModelTraining: boolean;
  trainingProgress: number; // 0-100

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  initializeCandles: (candles: Candle[]) => void;
  updateCandle: (candle: Candle) => void;
  setIndicators: (results: IndicatorResults) => void;
  setPrediction: (result: PredictionResult) => void;
  setModelTraining: (training: boolean) => void;
  setModelTrained: (trained: boolean) => void;
  setTrainingProgress: (progress: number) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  // Initial state
  connectionStatus: 'disconnected',
  candles: [],
  currentCandle: null,
  indicators: null,
  prediction: null,
  isModelTrained: false,
  isModelTraining: false,
  trainingProgress: 0,

  // Actions
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  initializeCandles: (candles) => set({
    candles: candles.slice(-MAX_CANDLES),
    currentCandle: null,
  }),

  updateCandle: (candle) => set((state) => {
    if (candle.isClosed) {
      // Candle closed: add to history, trim to max, clear current
      const updatedCandles = [...state.candles];

      // Check if this candle already exists (same time), replace it
      const existingIdx = updatedCandles.findIndex(c => c.time === candle.time);
      if (existingIdx >= 0) {
        updatedCandles[existingIdx] = candle;
      } else {
        updatedCandles.push(candle);
      }

      // Trim to max
      const trimmed = updatedCandles.length > MAX_CANDLES
        ? updatedCandles.slice(-MAX_CANDLES)
        : updatedCandles;

      return { candles: trimmed, currentCandle: null };
    } else {
      // Candle still open: update current candle display only
      return { currentCandle: candle };
    }
  }),

  setIndicators: (indicators) => set({ indicators }),
  setPrediction: (prediction) => set({ prediction }),
  setModelTraining: (isModelTraining) => set({ isModelTraining }),
  setModelTrained: (isModelTrained) => set({ isModelTrained }),
  setTrainingProgress: (trainingProgress) => set({ trainingProgress }),
}));
