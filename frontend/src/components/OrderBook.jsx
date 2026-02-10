import React, { useMemo } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { formatPrice, formatQuantity } from '../utils/formatters';

const MAX_DISPLAY_LEVELS = 15;

const OrderBook = React.memo(function OrderBook() {
  const orderBook = useMarketStore((s) => s.orderBooks[s.activeSymbol]);

  const { bids, asks, maxTotal } = useMemo(() => {
    if (!orderBook) return { bids: [], asks: [], maxTotal: 0 };

    const bids = orderBook.bids.slice(0, MAX_DISPLAY_LEVELS);
    const asks = orderBook.asks.slice(0, MAX_DISPLAY_LEVELS);
    const maxTotal = Math.max(
      bids.length > 0 ? bids[bids.length - 1].total : 0,
      asks.length > 0 ? asks[asks.length - 1].total : 0,
    );

    return { bids, asks: [...asks].reverse(), maxTotal };
  }, [orderBook]);

  if (!orderBook) {
    return (
      <div className="rounded-xl bg-bg-card border border-gray-700/50 p-4 h-full">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Order Book</h3>
        <div className="text-text-muted text-sm">Waiting for data...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-bg-card border border-gray-700/50 p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-text-secondary mb-2">Order Book</h3>

      {/* Header */}
      <div className="flex justify-between text-[10px] text-text-muted font-medium mb-1 px-1">
        <span>Price</span>
        <span>Qty</span>
        <span>Total</span>
      </div>

      {/* Asks (reversed, so lowest ask at bottom) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end mb-1">
        {asks.map((level, i) => (
          <OrderBookRow
            key={`a-${i}`}
            price={level.price}
            quantity={level.quantity}
            total={level.total}
            maxTotal={maxTotal}
            side="ask"
          />
        ))}
      </div>

      {/* Spread */}
      <div className="text-center py-1 border-y border-gray-700/30">
        <span className="text-xs font-mono text-accent-yellow">
          Spread: {formatPrice(orderBook.spread)} ({orderBook.spreadPercent?.toFixed(4)}%)
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden mt-1">
        {bids.map((level, i) => (
          <OrderBookRow
            key={`b-${i}`}
            price={level.price}
            quantity={level.quantity}
            total={level.total}
            maxTotal={maxTotal}
            side="bid"
          />
        ))}
      </div>
    </div>
  );
});

const OrderBookRow = React.memo(function OrderBookRow({ price, quantity, total, maxTotal, side }) {
  const width = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const bgColor = side === 'bid' ? 'rgba(0, 214, 143, 0.08)' : 'rgba(255, 61, 113, 0.08)';
  const textColor = side === 'bid' ? 'text-accent-green' : 'text-accent-red';

  return (
    <div className="relative flex justify-between items-center py-[2px] px-1 text-[11px] font-mono">
      <div
        className="absolute inset-0 right-0"
        style={{
          width: `${width}%`,
          backgroundColor: bgColor,
          [side === 'bid' ? 'left' : 'right']: 0,
        }}
      />
      <span className={`relative z-10 ${textColor}`}>{formatPrice(price)}</span>
      <span className="relative z-10 text-text-primary">{formatQuantity(quantity)}</span>
      <span className="relative z-10 text-text-muted">{formatQuantity(total)}</span>
    </div>
  );
});

export default OrderBook;
