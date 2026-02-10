import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
  type CandlestickData,
  type Time,
} from 'lightweight-charts';
import { useMarketStore } from '../store/marketStore';

export function CandlestickChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema12SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema26SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  const candles = useMarketStore(s => s.candles);
  const currentCandle = useMarketStore(s => s.currentCandle);
  const indicators = useMarketStore(s => s.indicators);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e17' },
        textColor: '#8a8f9c',
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1a1e2e' },
        horzLines: { color: '#1a1e2e' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
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

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00c176',
      downColor: '#ff3b69',
      borderUpColor: '#00c176',
      borderDownColor: '#ff3b69',
      wickUpColor: '#00c176',
      wickDownColor: '#ff3b69',
    });

    const sma20 = chart.addLineSeries({
      color: '#ffaa00',
      lineWidth: 1,
      title: 'SMA 20',
    });

    const ema12 = chart.addLineSeries({
      color: '#2962ff',
      lineWidth: 1,
      title: 'EMA 12',
    });

    const ema26 = chart.addLineSeries({
      color: '#9c27b0',
      lineWidth: 1,
      title: 'EMA 26',
    });

    const bbUpper = chart.addLineSeries({
      color: 'rgba(41, 98, 255, 0.4)',
      lineWidth: 1,
      lineStyle: 2, // Dashed
    });

    const bbMiddle = chart.addLineSeries({
      color: 'rgba(41, 98, 255, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
    });

    const bbLower = chart.addLineSeries({
      color: 'rgba(41, 98, 255, 0.4)',
      lineWidth: 1,
      lineStyle: 2,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    sma20SeriesRef.current = sma20;
    ema12SeriesRef.current = ema12;
    ema26SeriesRef.current = ema26;
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update candle data
  const toCandlestickData = useCallback((c: { time: number; open: number; high: number; low: number; close: number }): CandlestickData => ({
    time: c.time as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }), []);

  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;
    candleSeriesRef.current.setData(candles.map(toCandlestickData));
  }, [candles, toCandlestickData]);

  // Real-time update for in-progress candle
  useEffect(() => {
    if (!candleSeriesRef.current || !currentCandle) return;
    candleSeriesRef.current.update(toCandlestickData(currentCandle));
  }, [currentCandle, toCandlestickData]);

  // Update indicator overlays
  useEffect(() => {
    if (!indicators) return;

    if (sma20SeriesRef.current) {
      sma20SeriesRef.current.setData(
        indicators.sma20.map(p => ({ time: p.time as Time, value: p.value }))
      );
    }
    if (ema12SeriesRef.current) {
      ema12SeriesRef.current.setData(
        indicators.ema12.map(p => ({ time: p.time as Time, value: p.value }))
      );
    }
    if (ema26SeriesRef.current) {
      ema26SeriesRef.current.setData(
        indicators.ema26.map(p => ({ time: p.time as Time, value: p.value }))
      );
    }
    if (bbUpperRef.current) {
      bbUpperRef.current.setData(
        indicators.bollingerBands.map(p => ({ time: p.time as Time, value: p.upper }))
      );
    }
    if (bbMiddleRef.current) {
      bbMiddleRef.current.setData(
        indicators.bollingerBands.map(p => ({ time: p.time as Time, value: p.middle }))
      );
    }
    if (bbLowerRef.current) {
      bbLowerRef.current.setData(
        indicators.bollingerBands.map(p => ({ time: p.time as Time, value: p.lower }))
      );
    }
  }, [indicators]);

  return (
    <div className="chart-container">
      <div ref={chartContainerRef} className="chart-wrapper" />
    </div>
  );
}
