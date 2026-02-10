import { useEffect, useRef } from 'react';
import { PricePredictor } from '../engine/prediction/model';
import { extractFeatures, createSlidingWindows } from '../engine/prediction/features';
import { useMarketStore } from '../store/marketStore';

export function usePrediction() {
  const candles = useMarketStore(s => s.candles);
  const indicators = useMarketStore(s => s.indicators);
  const setPrediction = useMarketStore(s => s.setPrediction);
  const setModelTraining = useMarketStore(s => s.setModelTraining);
  const setModelTrained = useMarketStore(s => s.setModelTrained);
  const setTrainingProgress = useMarketStore(s => s.setTrainingProgress);

  const predictorRef = useRef<PricePredictor>(new PricePredictor());
  const isTrainingRef = useRef(false);
  const trainedRef = useRef(false);

  // Train on initial load (once we have sufficient data)
  useEffect(() => {
    if (trainedRef.current || isTrainingRef.current) return;
    if (candles.length < 200 || !indicators) return;

    const predictor = predictorRef.current;

    // Try loading cached model first
    predictor.load().then(loaded => {
      if (loaded) {
        trainedRef.current = true;
        setModelTrained(true);
        return;
      }

      // Train new model
      isTrainingRef.current = true;
      setModelTraining(true);

      const { features, normParams: _normParams } = extractFeatures(candles, indicators);
      if (features.length < 30) {
        isTrainingRef.current = false;
        setModelTraining(false);
        return;
      }

      const sequences = createSlidingWindows(features, 20);

      predictor.train(sequences, (epoch, total) => {
        setTrainingProgress(Math.round((epoch / total) * 100));
      }).then(() => {
        trainedRef.current = true;
        isTrainingRef.current = false;
        setModelTrained(true);
        setModelTraining(false);
        setTrainingProgress(100);
        predictor.save().catch(() => { /* ignore save errors */ });
      }).catch(() => {
        isTrainingRef.current = false;
        setModelTraining(false);
      });
    });
  }, [candles.length, indicators, setModelTraining, setModelTrained, setTrainingProgress]);

  // Predict on each new closed candle
  useEffect(() => {
    if (!trainedRef.current || !indicators) return;
    if (candles.length < 50) return;

    const { features, normParams } = extractFeatures(candles, indicators);
    if (features.length < 20) return;

    const lastClose = candles[candles.length - 1].close;
    const result = predictorRef.current.predict(features, normParams.close, lastClose);
    setPrediction(result);
  }, [candles, indicators, setPrediction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      predictorRef.current.dispose();
    };
  }, []);
}
