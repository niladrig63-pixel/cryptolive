import React, { useMemo } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { formatPrice, formatQuantity, formatTime } from '../utils/formatters';

const MAX_VISIBLE_TRADES = 30;
const EMPTY_ARRAY = [];

const TradeFeed = React.memo(function TradeFeed() {
  const trades = useMarketStore((s) => s.trades[s.activeSymbol]) || EMPTY_ARRAY;

  const recentTrades = useMemo(() => {
    return trades.slice(-MAX_VISIBLE_TRADES).reverse();
  }, [trades]);

  return (
    <div className="rounded-xl bg-bg-card border border-gray-700/50 p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-text-secondary mb-2">Recent Trades</h3>

      {/* Header */}
      <div className="flex justify-between text-[10px] text-text-muted font-medium mb-1 px-1">
        <span>Price</span>
        <span>Qty</span>
        <span>Time</span>
      </div>

      {/* Trade list */}
      <div className="flex-1 overflow-hidden">
        {recentTrades.length === 0 ? (
          <div className="text-text-muted text-sm mt-4 text-center">Waiting for trades...</div>
        ) : (
          recentTrades.map((trade, i) => (
            <TradeRow key={trade.tradeId || i} trade={trade} />
          ))
        )}
      </div>
    </div>
  );
});

const TradeRow = React.memo(function TradeRow({ trade }) {
  const isBuy = trade.side === 'buy';
  const textColor = isBuy ? 'text-accent-green' : 'text-accent-red';

  return (
    <div className="flex justify-between items-center py-[2px] px-1 text-[11px] font-mono hover:bg-bg-hover/50 transition-colors">
      <span className={textColor}>{formatPrice(trade.price)}</span>
      <span className="text-text-primary">{formatQuantity(trade.quantity)}</span>
      <span className="text-text-muted">{formatTime(trade.time)}</span>
    </div>
  );
});

export default TradeFeed;
