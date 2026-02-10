import { useEffect, useRef } from 'react';
import { BinanceSocket } from '../api/binanceSocket';
import { useMarketStore } from '../store/marketStore';

export function useBinanceStream() {
  const updateCandle = useMarketStore(s => s.updateCandle);
  const setConnectionStatus = useMarketStore(s => s.setConnectionStatus);
  const socketRef = useRef<BinanceSocket | null>(null);

  useEffect(() => {
    const socket = new BinanceSocket({
      symbol: 'btcusdt',
      interval: '1m',
      onCandle: updateCandle,
      onStatusChange: setConnectionStatus,
    });

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [updateCandle, setConnectionStatus]);
}
