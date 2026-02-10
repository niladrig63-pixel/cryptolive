import { useMarketStore } from '../store/marketStore';

const statusConfig: Record<string, { color: string; text: string }> = {
  connected:    { color: 'connected', text: 'Live' },
  connecting:   { color: 'connecting', text: 'Connecting...' },
  reconnecting: { color: 'reconnecting', text: 'Reconnecting...' },
  disconnected: { color: 'disconnected', text: 'Disconnected' },
};

export function ConnectionStatus() {
  const status = useMarketStore(s => s.connectionStatus);
  const config = statusConfig[status] || statusConfig.disconnected;

  return (
    <div className="connection-status">
      <span className={`status-dot ${config.color}`} />
      <span>{config.text}</span>
    </div>
  );
}
