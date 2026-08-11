import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prismaClient.js';
import { verifyPassword } from '../auth/password.js';
import { signBuyerGateToken } from '../auth/jwt.js';
import { buyerGateCookieOptions, buyerGateCookieName } from '../auth/cookies.js';
import { loadOrganizerPublic } from '../middleware/loadOrganizerPublic.js';
import { buyerGateFor } from '../middleware/buyerGate.js';
import { availablePercent, genAmountSuffix, genCode } from '../services/amounts.js';
import { verifyPurchase, NETWORKS } from '../services/chainVerify.js';
import { HttpError, asyncRoute } from '../httpError.js';

export const publicRoutes = Router();

const purchaseLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const unlockLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, limit: 6, standardHeaders: true, legacyHeaders: false });
const messageLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

function serializeTournamentPublic(t, purchases) {
  return {
    id: t.id,
    name: t.name,
    buyInMicro: t.buyInMicro,
    totalPercent: t.totalPercent,
    markup: t.markup,
    maxBullets: t.maxBullets,
    roiEstimado: t.roiEstimado,
    pricePerPercentMicro: t.pricePerPercentMicro,
    hasEvm: !!t.walletAddressEvm,
    deadline: t.deadline,
    liveStatus: t.liveStatus,
    liveNote: t.liveNote,
    availablePercent: availablePercent(t, purchases),
  };
}

// Solo los campos que el propio comprador necesita ver de su compra.
function serializePurchaseOwner(p) {
  return {
    id: p.id,
    code: p.code,
    tournamentId: p.tournamentId,
    tournamentName: p.tournament?.name,
    liveStatus: p.tournament?.liveStatus,
    liveNote: p.tournament?.liveNote,
    percent: p.percent,
    baseAmountMicro: p.baseAmountMicro,
    uniqueAmountMicro: p.uniqueAmountMicro,
    network: p.network,
    walletAddress: p.walletAddress,
    status: p.status,
    txHash: p.txHash,
    createdAt: p.createdAt,
  };
}

publicRoutes.get('/:slug/site', loadOrganizerPublic, (req, res) => {
  res.json({ siteName: req.organizerPublic.siteName, hasGate: !!req.organizerPublic.buyerPasscodeHash });
});

publicRoutes.post('/:slug/unlock', unlockLimiter, loadOrganizerPublic, asyncRoute(async (req, res) => {
  const { passcode } = req.body || {};
  if (!req.organizerPublic.buyerPasscodeHash) return res.json({ ok: true });
  const ok = await verifyPassword(String(passcode || ''), req.organizerPublic.buyerPasscodeHash);
  if (!ok) throw new HttpError(401, 'Código incorrecto');
  const token = signBuyerGateToken(req.params.slug);
  res.cookie(buyerGateCookieName(req.params.slug), token, buyerGateCookieOptions(req.params.slug));
  res.json({ ok: true });
}));

publicRoutes.get('/:slug/tournaments', loadOrganizerPublic, (req, res, next) => buyerGateFor(req.params.slug)(req, res, next), asyncRoute(async (req, res) => {
  const tournaments = await prisma.tournament.findMany({
    where: { organizerId: req.organizerId, status: 'activo' },
    orderBy: { createdAt: 'desc' },
    include: { purchases: true },
  });
  res.json(tournaments.map((t) => serializeTournamentPublic(t, t.purchases)));
}));

publicRoutes.post('/:slug/tournaments/:id/purchase', purchaseLimiter, loadOrganizerPublic, (req, res, next) => buyerGateFor(req.params.slug)(req, res, next), asyncRoute(async (req, res) => {
  const { percent, buyerName, buyerContact, originWallet, network } = req.body || {};
  const p = Number(percent);
  const name = String(buyerName || '').trim().slice(0, 120);
  const contact = String(buyerContact || '').trim().slice(0, 200);
  const origin = String(originWallet || '').trim().slice(0, 120);
  const net = ['trc20', 'eth', 'polygon'].includes(network) ? network : 'trc20';

  if (!Number.isFinite(p) || p <= 0) throw new HttpError(400, 'Porcentaje inválido');
  if (!name || !contact) throw new HttpError(400, 'Completá tu nombre y un contacto');

  const purchase = await prisma.$transaction(async (tx) => {
    // SQLite recién toma el lock de escritura en la primera escritura de la
    // transacción, no al leer. Sin esto, dos compras simultáneas podrían
    // leer el mismo "% disponible" antes de que cualquiera escriba y
    // sobrevender el torneo. Este incremento de `version` fuerza el lock de
    // inmediato y serializa el resto de la transacción.
    const lockCheck = await tx.tournament.updateMany({
      where: { id: req.params.id, organizerId: req.organizerId, status: 'activo' },
      data: { version: { increment: 1 } },
    });
    if (lockCheck.count === 0) throw new HttpError(404, 'Torneo no encontrado');
    const tournament = await tx.tournament.findFirst({ where: { id: req.params.id, organizerId: req.organizerId, status: 'activo' } });
    if (!tournament) throw new HttpError(404, 'Torneo no encontrado');
    if (net !== 'trc20' && !tournament.walletAddressEvm) throw new HttpError(400, 'Este torneo no acepta esa red');

    const purchases = await tx.purchase.findMany({ where: { tournamentId: tournament.id } });
    const avail = availablePercent(tournament, purchases);
    if (p > avail + 0.001) throw new HttpError(409, `Solo quedan ${avail.toFixed(2)}% disponibles`);

    const receivingAddress = net === 'trc20' ? tournament.walletAddress : tournament.walletAddressEvm;
    const baseAmountMicro = Math.round(p * tournament.pricePerPercentMicro);

    let created = null;
    for (let tries = 0; tries < 40 && !created; tries++) {
      const uniqueAmountMicro = baseAmountMicro + genAmountSuffix();
      const clash = await tx.purchase.findFirst({ where: { tournamentId: tournament.id, network: net, uniqueAmountMicro } });
      if (clash) continue;
      created = await tx.purchase.create({
        data: {
          tournamentId: tournament.id,
          code: genCode(),
          buyerName: name,
          buyerContact: contact,
          originWallet: origin,
          percent: p,
          baseAmountMicro,
          uniqueAmountMicro,
          network: net,
          walletAddress: receivingAddress,
        },
        include: { tournament: true },
      });
    }
    if (!created) throw new HttpError(500, 'No se pudo generar un monto único, probá de nuevo');
    return created;
  });

  res.status(201).json(serializePurchaseOwner(purchase));
}));

async function findOwnedPurchase(id, code) {
  const purchase = await prisma.purchase.findUnique({ where: { id }, include: { tournament: true } });
  // El código actúa como credencial de posesión: sin el código correcto,
  // nadie puede leer ni el estado ni el chat de una compra ajena.
  if (!purchase || purchase.code !== String(code || '').toUpperCase()) {
    throw new HttpError(404, 'Compra no encontrada');
  }
  return purchase;
}

publicRoutes.get('/purchases/by-code/:code', asyncRoute(async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const purchase = await prisma.purchase.findUnique({ where: { code }, include: { tournament: true } });
  if (!purchase) return res.json(null);
  res.json(serializePurchaseOwner(purchase));
}));

publicRoutes.post('/purchases/:id/verify', verifyLimiter, asyncRoute(async (req, res) => {
  const purchase = await findOwnedPurchase(req.params.id, req.body?.code);
  if (purchase.status !== 'pendiente') return res.json(serializePurchaseOwner(purchase));

  const organizer = await prisma.organizer.findUnique({ where: { id: purchase.tournament.organizerId } });
  const updated = await verifyPurchase(purchase, organizer?.etherscanKey).catch((err) => {
    throw new HttpError(502, err.message || 'No se pudo verificar');
  });
  const fresh = updated ? { ...updated, tournament: purchase.tournament } : purchase;
  res.json({ ...serializePurchaseOwner(fresh), verified: !!updated });
}));

publicRoutes.get('/purchases/:id/messages', asyncRoute(async (req, res) => {
  const purchase = await findOwnedPurchase(req.params.id, req.query.code);
  const messages = await prisma.message.findMany({ where: { purchaseId: purchase.id }, orderBy: { createdAt: 'asc' } });
  res.json(messages);
}));

publicRoutes.post('/purchases/:id/messages', messageLimiter, asyncRoute(async (req, res) => {
  const purchase = await findOwnedPurchase(req.params.id, req.body?.code);
  const text = String(req.body?.text || '').trim().slice(0, 2000);
  if (!text) throw new HttpError(400, 'Mensaje vacío');
  const message = await prisma.$transaction(async (tx) => {
    const m = await tx.message.create({ data: { purchaseId: purchase.id, sender: 'comprador', text } });
    await tx.purchase.update({ where: { id: purchase.id }, data: { unreadOrganizer: { increment: 1 } } });
    return m;
  });
  res.status(201).json(message);
}));

publicRoutes.get('/networks', (req, res) => {
  res.json(Object.fromEntries(Object.entries(NETWORKS).map(([k, v]) => [k, { label: v.label, short: v.short }])));
});
