import { useMarketStore } from '../store/marketStore';

export function PredictionBadge() {
  const prediction = useMarketStore(s => s.prediction);
  const isModelTrained = useMarketStore(s => s.isModelTrained);
  const isModelTraining = useMarketStore(s => s.isModelTraining);
  const trainingProgress = useMarketStore(s => s.trainingProgress);

  if (isModelTraining) {
    return (
      <div className="prediction-badge neutral card">
        <span className="prediction-label">ML Prediction</span>
        <span className="prediction-training">Training... {trainingProgress}%</span>
      </div>
    );
  }

  if (!isModelTrained || !prediction) {
    return (
      <div className="prediction-badge neutral card">
        <span className="prediction-label">ML Prediction</span>
        <span className="prediction-confidence">Awaiting data...</span>
      </div>
    );
  }

  const changeStr = prediction.predictedChange >= 0
    ? `+${prediction.predictedChange.toFixed(3)}%`
    : `${prediction.predictedChange.toFixed(3)}%`;

  return (
    <div className={`prediction-badge ${prediction.signal}`}>
      <span className="prediction-label">ML Prediction</span>
      <span className={`prediction-signal ${prediction.signal}`}>
        {prediction.signal}
      </span>
      <span className="prediction-confidence">
        {(prediction.confidence * 100).toFixed(0)}% confidence
      </span>
      <span
        className="prediction-change"
        style={{ color: prediction.predictedChange >= 0 ? 'var(--green)' : 'var(--red)' }}
      >
        {changeStr}
      </span>
    </div>
  );
}
