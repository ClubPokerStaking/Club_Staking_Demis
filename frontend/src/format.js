export const MICRO = 1_000_000;

export function fmtUSDT(micro) {
  return (Number(micro) / MICRO).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

// Para montos "para humanos" (precios, no el monto exacto a pagar) —
// siempre 2 decimales, sin la precisión extra que necesita el matching
// on-chain.
export function fmtUSDT2(micro) {
  return (Number(micro) / MICRO).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const NETWORKS = {
  trc20: { label: 'USDT · TRC20 (Tron)', short: 'TRC20' },
  eth: { label: 'USDT · Ethereum (ERC20)', short: 'Ethereum' },
  polygon: { label: 'USDT · Polygon', short: 'Polygon' },
};

export const LIVE_STATUS_MAP = {
  registro: { label: 'Late Registration', cls: 'pk-bg-straw-soft pk-straw' },
  jugando: { label: 'Jugando', cls: 'pk-bg-gold-soft pk-gold' },
  mesa_final: { label: 'Mesa Final', cls: 'pk-bg-gold-soft pk-gold' },
  finalizado: { label: 'Finalizado', cls: 'pk-surface2 pk-ivory-dim' },
  cancelado: { label: 'Cancelado', cls: 'pk-bg-brick-soft pk-brick' },
};

export function txExplorerUrl(network, txHash) {
  if (network === 'eth') return `https://etherscan.io/tx/${txHash}`;
  if (network === 'polygon') return `https://polygonscan.com/tx/${txHash}`;
  return `https://tronscan.org/#/transaction/${txHash}`;
}

export const RESERVE_MINUTES = 15;
export function minutesLeft(createdAt) {
  return Math.max(0, RESERVE_MINUTES - (Date.now() - new Date(createdAt).getTime()) / 60000);
}
