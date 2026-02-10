import * as tf from '@tensorflow/tfjs';
import type { FeatureVector } from './features';
import { denormalize, type NormalizationParams } from './normalize';

export type PredictionSignal = 'bullish' | 'bearish' | 'neutral';

export interface PredictionResult {
  signal: PredictionSignal;
  confidence: number;     // 0-1
  predictedChange: number; // Predicted % change
  timestamp: number;
}

const WINDOW_SIZE = 20;
const NUM_FEATURES = 5;

export class PricePredictor {
  private model: tf.LayersModel | null = null;
  private _isTrained = false;

  get isTrained(): boolean {
    return this._isTrained;
  }

  /** Build the LSTM model architecture */
  private buildModel(): tf.LayersModel {
    const model = tf.sequential();

    model.add(tf.layers.lstm({
      units: 32,
      returnSequences: true,
      inputShape: [WINDOW_SIZE, NUM_FEATURES],
    }));

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.lstm({
      units: 16,
      returnSequences: false,
    }));

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
    });

    return model;
  }

  /**
   * Train the model on historical sliding window data.
   * @param sequences - Array of { input: number[][], output: number[] }
   * @param onProgress - Optional callback for training progress
   */
  async train(
    sequences: { input: number[][]; output: number[] }[],
    onProgress?: (epoch: number, totalEpochs: number) => void,
  ): Promise<void> {
    if (sequences.length < 10) return;

    this.model = this.buildModel();

    // Convert to tensors
    const xs = tf.tensor3d(sequences.map(s => s.input));
    const ys = tf.tensor2d(sequences.map(s => s.output));

    const epochs = 50;

    try {
      await this.model.fit(xs, ys, {
        epochs,
        batchSize: 32,
        validationSplit: 0.1,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch) => {
            onProgress?.(epoch + 1, epochs);
          },
        },
      });
      this._isTrained = true;
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  /**
   * Predict next candle direction from recent feature vectors.
   * @param recentFeatures - Last WINDOW_SIZE feature vectors
   * @param closeNormParams - Normalization params for close price (to denormalize prediction)
   * @param lastClosePrice - Actual last close price (for % change calculation)
   */
  predict(
    recentFeatures: FeatureVector[],
    closeNormParams: NormalizationParams,
    lastClosePrice: number,
  ): PredictionResult {
    if (!this.model || !this._isTrained) {
      return { signal: 'neutral', confidence: 0, predictedChange: 0, timestamp: Date.now() };
    }

    if (recentFeatures.length < WINDOW_SIZE) {
      return { signal: 'neutral', confidence: 0, predictedChange: 0, timestamp: Date.now() };
    }

    // Take last WINDOW_SIZE features
    const window = recentFeatures.slice(-WINDOW_SIZE);
    const inputData = window.map(f => [f.close, f.volume, f.rsi, f.macdHist, f.bbPosition]);

    const inputTensor = tf.tensor3d([inputData]);
    const outputTensor = this.model.predict(inputTensor) as tf.Tensor;
    const predictedNormalized = outputTensor.dataSync()[0];

    inputTensor.dispose();
    outputTensor.dispose();

    // Denormalize predicted close
    const predictedClose = denormalize(predictedNormalized, closeNormParams);
    const predictedChange = ((predictedClose - lastClosePrice) / lastClosePrice) * 100;

    // Determine signal and confidence
    const absChange = Math.abs(predictedChange);
    let signal: PredictionSignal;
    let confidence: number;

    if (absChange < 0.05) {
      signal = 'neutral';
      confidence = 0.3 + Math.random() * 0.2; // Low confidence for neutral
    } else if (predictedChange > 0) {
      signal = 'bullish';
      confidence = Math.min(0.95, 0.5 + absChange * 0.1);
    } else {
      signal = 'bearish';
      confidence = Math.min(0.95, 0.5 + absChange * 0.1);
    }

    return {
      signal,
      confidence,
      predictedChange,
      timestamp: Date.now(),
    };
  }

  /** Save model to localStorage */
  async save(): Promise<void> {
    if (!this.model) return;
    await this.model.save('localstorage://btc-prediction-model');
  }

  /** Load model from localStorage */
  async load(): Promise<boolean> {
    try {
      this.model = await tf.loadLayersModel('localstorage://btc-prediction-model');
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
      });
      this._isTrained = true;
      return true;
    } catch {
      return false;
    }
  }

  /** Dispose of the model to free memory */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this._isTrained = false;
  }
}
