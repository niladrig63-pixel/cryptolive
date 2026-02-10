import React, { useEffect, useRef, useMemo } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

const EMPTY_ARRAY = [];

const PriceChart = React.memo(function PriceChart() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const klines = useMarketStore((s) => s.klines[s.activeSymbol]) || EMPTY_ARRAY;

  // Create chart on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1f2e' },
        textColor: '#8b95a5',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(139, 149, 165, 0.06)' },
        horzLines: { color: 'rgba(139, 149, 165, 0.06)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(51, 102, 255, 0.4)', width: 1, style: 2 },
        horzLine: { color: 'rgba(51, 102, 255, 0.4)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(139, 149, 165, 0.1)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(139, 149, 165, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00d68f',
      downColor: '#ff3d71',
      borderUpColor: '#00d68f',
      borderDownColor: '#ff3d71',
      wickUpColor: '#00d68f',
      wickDownColor: '#ff3d71',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#3366ff',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update data when klines change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || klines.length === 0) return;

    const candleData = klines.map((k) => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    const volumeData = klines.map((k) => ({
      time: k.time,
      value: k.volume,
      color: k.close >= k.open ? 'rgba(0, 214, 143, 0.3)' : 'rgba(255, 61, 113, 0.3)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
  }, [klines, activeSymbol]);

  return (
    <div className="rounded-xl bg-bg-card border border-gray-700/50 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700/30">
        <h3 className="text-sm font-semibold text-text-secondary">Price Chart — 1m</h3>
      </div>
      <div ref={chartContainerRef} className="w-full" style={{ height: '400px' }} />
    </div>
  );
});

export default PriceChart;
