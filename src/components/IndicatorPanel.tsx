import { useEffect, useRef } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  type Time,
} from 'lightweight-charts';
import { useMarketStore } from '../store/marketStore';

export function IndicatorPanel() {
  return (
    <div className="indicator-panels">
      <RSIChart />
      <MACDChart />
    </div>
  );
}

function RSIChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const overboughtRef = useRef<ISeriesApi<'Line'> | null>(null);
  const oversoldRef = useRef<ISeriesApi<'Line'> | null>(null);

  const indicators = useMarketStore(s => s.indicators);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 150,
      layout: {
        background: { type: ColorType.Solid, color: '#151a28' },
        textColor: '#8a8f9c',
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a1e2e' },
        horzLines: { color: '#1a1e2e' },
      },
      rightPriceScale: {
        borderColor: '#1e2336',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#1e2336',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const rsiSeries = chart.addLineSeries({
      color: '#ffaa00',
      lineWidth: 2,
      title: 'RSI(14)',
    });

    // Overbought line at 70
    const overbought = chart.addLineSeries({
      color: 'rgba(255, 59, 105, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
    });

    // Oversold line at 30
    const oversold = chart.addLineSeries({
      color: 'rgba(0, 193, 118, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
    });

    chartRef.current = chart;
    rsiSeriesRef.current = rsiSeries;
    overboughtRef.current = overbought;
    oversoldRef.current = oversold;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!indicators?.rsi.length) return;

    if (rsiSeriesRef.current) {
      rsiSeriesRef.current.setData(
        indicators.rsi.map(p => ({ time: p.time as Time, value: p.value }))
      );
    }

    // Draw horizontal lines
    if (overboughtRef.current) {
      overboughtRef.current.setData(
        indicators.rsi.map(p => ({ time: p.time as Time, value: 70 }))
      );
    }
    if (oversoldRef.current) {
      oversoldRef.current.setData(
        indicators.rsi.map(p => ({ time: p.time as Time, value: 30 }))
      );
    }
  }, [indicators]);

  return (
    <div className="indicator-panel">
      <div className="indicator-panel-header">
        <span className="indicator-panel-title">RSI (14)</span>
        {indicators?.rsi.length ? (
          <span
            className="indicator-panel-title"
            style={{
              color: indicators.rsi[indicators.rsi.length - 1].value > 70
                ? 'var(--red)'
                : indicators.rsi[indicators.rsi.length - 1].value < 30
                ? 'var(--green)'
                : 'var(--text-secondary)',
            }}
          >
            {indicators.rsi[indicators.rsi.length - 1].value.toFixed(1)}
          </span>
        ) : null}
      </div>
      <div ref={containerRef} />
    </div>
  );
}

function MACDChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const signalLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const histogramRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const indicators = useMarketStore(s => s.indicators);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 150,
      layout: {
        background: { type: ColorType.Solid, color: '#151a28' },
        textColor: '#8a8f9c',
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a1e2e' },
        horzLines: { color: '#1a1e2e' },
      },
      rightPriceScale: {
        borderColor: '#1e2336',
      },
      timeScale: {
        borderColor: '#1e2336',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const histogramSeries = chart.addHistogramSeries({
      color: '#00c176',
    });

    const macdLine = chart.addLineSeries({
      color: '#2962ff',
      lineWidth: 2,
      title: 'MACD',
    });

    const signalLine = chart.addLineSeries({
      color: '#ff3b69',
      lineWidth: 1,
      title: 'Signal',
    });

    chartRef.current = chart;
    macdLineRef.current = macdLine;
    signalLineRef.current = signalLine;
    histogramRef.current = histogramSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!indicators?.macd.length) return;

    if (macdLineRef.current) {
      macdLineRef.current.setData(
        indicators.macd.map(p => ({ time: p.time as Time, value: p.macd }))
      );
    }
    if (signalLineRef.current) {
      signalLineRef.current.setData(
        indicators.macd.map(p => ({ time: p.time as Time, value: p.signal }))
      );
    }
    if (histogramRef.current) {
      histogramRef.current.setData(
        indicators.macd.map(p => ({
          time: p.time as Time,
          value: p.histogram,
          color: p.histogram >= 0 ? '#00c17680' : '#ff3b6980',
        }))
      );
    }
  }, [indicators]);

  return (
    <div className="indicator-panel">
      <div className="indicator-panel-header">
        <span className="indicator-panel-title">MACD (12, 26, 9)</span>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
