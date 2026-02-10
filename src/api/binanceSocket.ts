import type { BinanceKlineEvent } from './types';
import type { ConnectionStatus } from './types';
import { parseKlineEvent, type Candle } from '../engine/candle';

export interface BinanceSocketOptions {
  symbol: string;          // e.g. "btcusdt"
  interval: string;        // e.g. "1m"
  onCandle: (candle: Candle) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

const WS_BASE = 'wss://stream.binance.com:9443/ws';

export class BinanceSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private shouldReconnect = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private options: BinanceSocketOptions) {}

  connect(): void {
    this.shouldReconnect = true;
    this.options.onStatusChange('connecting');

    const stream = `${this.options.symbol}@kline_${this.options.interval}`;
    const url = `${WS_BASE}/${stream}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.options.onStatusChange('disconnected');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onStatusChange('connected');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    this.ws.onclose = () => {
      this.options.onStatusChange('disconnected');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.options.onStatusChange('disconnected');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string) as BinanceKlineEvent;
      if (data.e !== 'kline') return;
      const candle = parseKlineEvent(data);
      this.options.onCandle(candle);
    } catch {
      // Silently ignore malformed messages
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    this.options.onStatusChange('reconnecting');
    this.reconnectAttempts++;

    // Exponential backoff with jitter: min(1000 * 2^attempts + random(0,1000), 30000)
    const baseDelay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay,
    );
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, this.maxReconnectDelay);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
