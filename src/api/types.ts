// Raw Binance WebSocket kline event payload
export interface BinanceKlineEvent {
  e: string;       // Event type: "kline"
  E: number;       // Event time (ms)
  s: string;       // Symbol
  k: BinanceKlineData;
}

export interface BinanceKlineData {
  t: number;   // Kline start time (ms)
  T: number;   // Kline close time (ms)
  s: string;   // Symbol
  i: string;   // Interval
  f: number;   // First trade ID
  L: number;   // Last trade ID
  o: string;   // Open price
  c: string;   // Close price
  h: string;   // High price
  l: string;   // Low price
  v: string;   // Base asset volume
  n: number;   // Number of trades
  x: boolean;  // Is this kline closed?
  q: string;   // Quote asset volume
  V: string;   // Taker buy base asset volume
  Q: string;   // Taker buy quote asset volume
  B: string;   // Ignore
}

// Raw REST kline response element (array of mixed types)
export type BinanceKlineRaw = [
  number,  // 0: Open time (ms)
  string,  // 1: Open price
  string,  // 2: High price
  string,  // 3: Low price
  string,  // 4: Close price
  string,  // 5: Volume
  number,  // 6: Close time (ms)
  string,  // 7: Quote asset volume
  number,  // 8: Number of trades
  string,  // 9: Taker buy base asset volume
  string,  // 10: Taker buy quote asset volume
  string,  // 11: Ignore
];

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
