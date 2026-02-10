/**
 * Number formatting utilities for financial display
 */

export function formatPrice(price, decimals = 2) {
  if (price == null || isNaN(price)) return '—';
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(decimals);
  }
  // Small prices (altcoins)
  return price.toPrecision(6);
}

export function formatVolume(vol) {
  if (vol == null || isNaN(vol)) return '—';
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(2) + 'B';
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(2) + 'K';
  return vol.toFixed(2);
}

export function formatPercent(pct) {
  if (pct == null || isNaN(pct)) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatQuantity(qty) {
  if (qty == null || isNaN(qty)) return '—';
  if (qty >= 1000) return qty.toFixed(2);
  if (qty >= 1) return qty.toFixed(4);
  return qty.toFixed(6);
}

export function formatTime(timestampMs) {
  if (!timestampMs) return '—';
  const d = new Date(timestampMs);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

export function getSymbolDisplay(symbol) {
  // BTCUSDT -> BTC/USDT
  if (symbol.endsWith('USDT')) {
    return symbol.slice(0, -4) + '/USDT';
  }
  return symbol;
}
