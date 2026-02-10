import type { BinanceKlineEvent, BinanceKlineRaw } from '../api/types';

export interface Candle {
  time: number;      // Unix timestamp in SECONDS (lightweight-charts requirement)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

/** Parse a Binance WebSocket kline event into internal Candle format */
export function parseKlineEvent(event: BinanceKlineEvent): Candle {
  const k = event.k;
  return {
    time: Math.floor(k.t / 1000),
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
    volume: parseFloat(k.v),
    isClosed: k.x,
  };
}

/** Parse a Binance REST kline array into internal Candle format */
export function parseKlineRaw(raw: BinanceKlineRaw): Candle {
  return {
    time: Math.floor(raw[0] / 1000),
    open: parseFloat(raw[1]),
    high: parseFloat(raw[2]),
    low: parseFloat(raw[3]),
    close: parseFloat(raw[4]),
    volume: parseFloat(raw[5]),
    isClosed: true, // Historical candles are always closed
  };
}
