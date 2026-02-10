import React from 'react';
import { useMarketStore } from '../stores/marketStore';

const STATUS_CONFIG = {
  connected: { color: 'bg-accent-green', text: 'Live', pulse: true },
  connecting: { color: 'bg-accent-yellow', text: 'Connecting...', pulse: true },
  reconnecting: { color: 'bg-accent-yellow', text: 'Reconnecting...', pulse: true },
  disconnected: { color: 'bg-accent-red', text: 'Disconnected', pulse: false },
};

const ConnectionStatus = React.memo(function ConnectionStatus() {
  const status = useMarketStore((s) => s.connectionStatus);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-gray-700/50">
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.color}`} />
      </span>
      <span className="text-xs font-medium text-text-secondary">{config.text}</span>
    </div>
  );
});

export default ConnectionStatus;
