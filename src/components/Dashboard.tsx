import { useHistoricalData } from '../hooks/useHistoricalData';
import { useBinanceStream } from '../hooks/useBinanceStream';
import { useIndicators } from '../hooks/useIndicators';
import { usePrediction } from '../hooks/usePrediction';
import { LivePrice } from './LivePrice';
import { PredictionBadge } from './PredictionBadge';
import { MarketStats } from './MarketStats';
import { ConnectionStatus } from './ConnectionStatus';
import { CandlestickChart } from './CandlestickChart';
import { IndicatorPanel } from './IndicatorPanel';
import { useMarketStore } from '../store/marketStore';

export function Dashboard() {
  // Initialize data streams
  useHistoricalData();
  useBinanceStream();
  useIndicators();
  usePrediction();

  const candles = useMarketStore(s => s.candles);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>BTC/USDT Crypto Prediction</h1>
        <ConnectionStatus />
      </header>
      <main className="dashboard-main">
        <div className="stats-row">
          <LivePrice />
          <MarketStats />
          <PredictionBadge />
        </div>
        {candles.length > 0 ? (
          <>
            <CandlestickChart />
            <IndicatorPanel />
          </>
        ) : (
          <div className="loading">Loading historical data...</div>
        )}
      </main>
      <div className="disclaimer">
        This tool is for educational purposes only. Not financial advice. ML predictions are experimental and should not be used for trading decisions.
      </div>
    </div>
  );
}
