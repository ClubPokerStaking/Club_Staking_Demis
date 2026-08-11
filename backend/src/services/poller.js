import { prisma } from '../prismaClient.js';
import { verifyPurchase } from './chainVerify.js';
import { RESERVE_MINUTES } from './amounts.js';

const POLL_INTERVAL_MS = 30000;
const MIN_RECHECK_MS = 20000;

// Corre en el proceso del servidor (no en cada navegador de comprador),
// así las claves de Etherscan/Trongrid nunca viajan al cliente y no se
// multiplican los pedidos a la red externa por cada persona mirando la
// pantalla de pago.
export function startPaymentPoller() {
  setInterval(runOnce, POLL_INTERVAL_MS);
}

async function runOnce() {
  const cutoff = new Date(Date.now() - RESERVE_MINUTES * 60000);
  const recheckCutoff = new Date(Date.now() - MIN_RECHECK_MS);
  const pending = await prisma.purchase.findMany({
    where: {
      status: 'pendiente',
      createdAt: { gte: cutoff },
      OR: [{ lastVerifyAt: null }, { lastVerifyAt: { lt: recheckCutoff } }],
    },
    include: { tournament: { include: { organizer: true } } },
  });

  for (const purchase of pending) {
    try {
      await verifyPurchase(purchase, purchase.tournament.organizer.etherscanKey);
    } catch (err) {
      await prisma.purchase.update({ where: { id: purchase.id }, data: { lastVerifyAt: new Date() } }).catch(() => {});
      console.error(`[poller] error verificando compra ${purchase.id}:`, err.message);
    }
  }
}
