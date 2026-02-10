import React, { useCallback } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { getSymbolDisplay, formatPrice, formatPercent } from '../utils/formatters';

const AssetSelector = React.memo(function AssetSelector({ onSwitch }) {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const availableSymbols = useMarketStore((s) => s.availableSymbols);
  const tickers = useMarketStore((s) => s.tickers);

  const handleSelect = useCallback((symbol) => {
    useMarketStore.getState().setActiveSymbol(symbol);
    onSwitch?.(symbol);
  }, [onSwitch]);

  return (
    <div className="flex gap-2 flex-wrap">
      {availableSymbols.map((symbol) => {
        const isActive = symbol === activeSymbol;
        const ticker = tickers[symbol];
        const changePercent = ticker?.priceChangePercent;
        const isPositive = changePercent >= 0;

        return (
          <button
            key={symbol}
            onClick={() => handleSelect(symbol)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
              border text-sm font-medium
              ${isActive
                ? 'bg-accent-blue/20 border-accent-blue text-white'
                : 'bg-bg-card border-gray-700/50 text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }
            `}
          >
            <span className="font-semibold">{getSymbolDisplay(symbol)}</span>
            {ticker && (
              <>
                <span className="text-text-primary font-mono text-xs">
                  {formatPrice(ticker.lastPrice)}
                </span>
                <span className={`text-xs font-mono ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                  {formatPercent(changePercent)}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default AssetSelector;
