import { randomBytes } from 'node:crypto';

// Todos los montos de USDT se manejan como enteros en "micro-USDT"
// (USDT * 1_000_000) para poder compararlos exactamente contra los valores
// on-chain (que también vienen en unidades de 6 decimales) sin depender de
// tolerancias de punto flotante.
export const MICRO = 1_000_000;

export function toMicro(usdt) {
  return Math.round(Number(usdt) * MICRO);
}

export function fromMicro(micro) {
  return Number(micro) / MICRO;
}

export function fmtUSDT(micro) {
  return fromMicro(micro).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

const RESERVE_MINUTES = 15;
export { RESERVE_MINUTES };

export function reservedPercent(purchases, now = Date.now()) {
  return purchases
    .filter((p) => p.status === 'confirmado' || (p.status === 'pendiente' && now - new Date(p.createdAt).getTime() < RESERVE_MINUTES * 60000))
    .reduce((s, p) => s + p.percent, 0);
}

export function availablePercent(tournament, purchases, now = Date.now()) {
  return Math.max(0, tournament.totalPercent - reservedPercent(purchases, now));
}

export function genCode() {
  // Bytes criptográficamente aleatorios, no Math.random() — este código
  // funciona como credencial de acceso a la compra (datos del comprador +
  // chat), así que tiene que ser difícil de adivinar por fuerza bruta.
  return randomBytes(8).toString('hex').toUpperCase();
}

export function genAmountSuffix() {
  // Entero aleatorio 100-9999 (micro-USDT extra) para hacer único el monto.
  return 100 + randomBytes(2).readUInt16BE(0) % 9900;
}
