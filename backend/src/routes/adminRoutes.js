import { Router } from 'express';
import { prisma } from '../prismaClient.js';
import { requireOrganizerAuth } from '../middleware/requireOrganizerAuth.js';
import { hashPassword } from '../auth/password.js';
import { availablePercent } from '../services/amounts.js';
import { verifyPurchase, testEtherscanKey } from '../services/chainVerify.js';
import { HttpError, asyncRoute } from '../httpError.js';

export const adminRoutes = Router();
adminRoutes.use(requireOrganizerAuth);

function serializeTournamentAdmin(t, purchases) {
  return {
    id: t.id,
    name: t.name,
    buyInMicro: t.buyInMicro,
    totalPercent: t.totalPercent,
    markup: t.markup,
    maxBullets: t.maxBullets,
    roiEstimado: t.roiEstimado,
    pricePerPercentMicro: t.pricePerPercentMicro,
    walletAddress: t.walletAddress,
    walletAddressEvm: t.walletAddressEvm,
    deadline: t.deadline,
    status: t.status,
    liveStatus: t.liveStatus,
    liveNote: t.liveNote,
    availablePercent: availablePercent(t, purchases),
    createdAt: t.createdAt,
  };
}

async function loadOwnTournament(organizerId, id) {
  const t = await prisma.tournament.findFirst({ where: { id, organizerId } });
  if (!t) throw new HttpError(404, 'Torneo no encontrado');
  return t;
}

function parseTournamentInput(body) {
  const markup = Number(body.markup) || 1;
  const buyIn = Number(body.buyIn) || 0;
  const buyInMicro = Math.round(buyIn * 1_000_000);
  const pricePerPercentMicro = Math.round((buyInMicro * markup) / 100);
  const name = String(body.name || '').trim().slice(0, 200);
  const walletAddress = String(body.walletAddress || '').trim();
  if (!name) throw new HttpError(400, 'Falta el nombre del torneo');
  if (!walletAddress) throw new HttpError(400, 'Falta la wallet de recepción');
  if (markup <= 0) throw new HttpError(400, 'El markup debe ser mayor a 0');
  const totalPercent = Number(body.totalPercent) || 100;
  if (totalPercent <= 0 || totalPercent > 1000) throw new HttpError(400, '% total inválido');

  return {
    name,
    buyInMicro,
    totalPercent,
    markup,
    maxBullets: Math.max(1, Number(body.maxBullets) || 1),
    roiEstimado: body.roiEstimado !== '' && body.roiEstimado != null ? Number(body.roiEstimado) : null,
    pricePerPercentMicro,
    walletAddress,
    walletAddressEvm: String(body.walletAddressEvm || '').trim() || null,
    deadline: String(body.deadline || '').trim() || null,
  };
}

adminRoutes.get('/tournaments', asyncRoute(async (req, res) => {
  const tournaments = await prisma.tournament.findMany({
    where: { organizerId: req.organizer.id },
    orderBy: { createdAt: 'desc' },
    include: { purchases: true },
  });
  res.json(tournaments.map((t) => serializeTournamentAdmin(t, t.purchases)));
}));

adminRoutes.post('/tournaments', asyncRoute(async (req, res) => {
  const data = parseTournamentInput(req.body || {});
  const t = await prisma.tournament.create({ data: { ...data, organizerId: req.organizer.id } });
  res.status(201).json(serializeTournamentAdmin(t, []));
}));

adminRoutes.put('/tournaments/:id', asyncRoute(async (req, res) => {
  await loadOwnTournament(req.organizer.id, req.params.id);
  const data = parseTournamentInput(req.body || {});
  const t = await prisma.tournament.update({ where: { id: req.params.id }, data });
  const purchases = await prisma.purchase.findMany({ where: { tournamentId: t.id } });
  res.json(serializeTournamentAdmin(t, purchases));
}));

adminRoutes.post('/tournaments/:id/toggle-close', asyncRoute(async (req, res) => {
  const existing = await loadOwnTournament(req.organizer.id, req.params.id);
  const t = await prisma.tournament.update({
    where: { id: existing.id },
    data: { status: existing.status === 'activo' ? 'cerrado' : 'activo' },
  });
  const purchases = await prisma.purchase.findMany({ where: { tournamentId: t.id } });
  res.json(serializeTournamentAdmin(t, purchases));
}));

adminRoutes.put('/tournaments/:id/live-status', asyncRoute(async (req, res) => {
  const existing = await loadOwnTournament(req.organizer.id, req.params.id);
  const liveStatus = String(req.body?.liveStatus || 'registro');
  const liveNote = String(req.body?.liveNote || '').slice(0, 300);
  const t = await prisma.tournament.update({
    where: { id: existing.id },
    data: { liveStatus, liveNote, liveUpdatedAt: new Date() },
  });
  const purchases = await prisma.purchase.findMany({ where: { tournamentId: t.id } });
  res.json(serializeTournamentAdmin(t, purchases));
}));

adminRoutes.delete('/tournaments/:id', asyncRoute(async (req, res) => {
  await loadOwnTournament(req.organizer.id, req.params.id);
  // onDelete: Cascade en el schema se encarga de compras y mensajes.
  await prisma.tournament.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

function serializePurchaseAdmin(p) {
  return {
    id: p.id,
    code: p.code,
    tournamentId: p.tournamentId,
    tournamentName: p.tournament?.name,
    buyerName: p.buyerName,
    buyerContact: p.buyerContact,
    originWallet: p.originWallet,
    percent: p.percent,
    baseAmountMicro: p.baseAmountMicro,
    uniqueAmountMicro: p.uniqueAmountMicro,
    network: p.network,
    walletAddress: p.walletAddress,
    status: p.status,
    txHash: p.txHash,
    unreadOrganizer: p.unreadOrganizer,
    createdAt: p.createdAt,
  };
}

adminRoutes.get('/purchases', asyncRoute(async (req, res) => {
  const purchases = await prisma.purchase.findMany({
    where: { tournament: { organizerId: req.organizer.id } },
    include: { tournament: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(purchases.map(serializePurchaseAdmin));
}));

async function loadOwnPurchase(organizerId, id) {
  const p = await prisma.purchase.findFirst({ where: { id, tournament: { organizerId } }, include: { tournament: true } });
  if (!p) throw new HttpError(404, 'Compra no encontrada');
  return p;
}

adminRoutes.put('/purchases/:id/status', asyncRoute(async (req, res) => {
  const existing = await loadOwnPurchase(req.organizer.id, req.params.id);
  const status = String(req.body?.status || '');
  if (!['pendiente', 'confirmado', 'rechazado'].includes(status)) throw new HttpError(400, 'Estado inválido');
  const p = await prisma.purchase.update({ where: { id: existing.id }, data: { status } });
  res.json(serializePurchaseAdmin({ ...p, tournament: existing.tournament }));
}));

adminRoutes.post('/purchases/:id/verify', asyncRoute(async (req, res) => {
  const existing = await loadOwnPurchase(req.organizer.id, req.params.id);
  if (existing.status !== 'pendiente') return res.json(serializePurchaseAdmin(existing));
  const updated = await verifyPurchase(existing, req.organizer.etherscanKey).catch((err) => {
    throw new HttpError(502, err.message || 'No se pudo verificar');
  });
  const fresh = updated ? { ...updated, tournament: existing.tournament } : existing;
  res.json({ ...serializePurchaseAdmin(fresh), verified: !!updated });
}));

adminRoutes.delete('/purchases/:id', asyncRoute(async (req, res) => {
  await loadOwnPurchase(req.organizer.id, req.params.id);
  await prisma.purchase.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

adminRoutes.get('/purchases/:id/messages', asyncRoute(async (req, res) => {
  const existing = await loadOwnPurchase(req.organizer.id, req.params.id);
  if (existing.unreadOrganizer) {
    await prisma.purchase.update({ where: { id: existing.id }, data: { unreadOrganizer: 0 } });
  }
  const messages = await prisma.message.findMany({ where: { purchaseId: existing.id }, orderBy: { createdAt: 'asc' } });
  res.json(messages);
}));

adminRoutes.post('/purchases/:id/messages', asyncRoute(async (req, res) => {
  const existing = await loadOwnPurchase(req.organizer.id, req.params.id);
  const text = String(req.body?.text || '').trim().slice(0, 2000);
  if (!text) throw new HttpError(400, 'Mensaje vacío');
  const message = await prisma.message.create({ data: { purchaseId: existing.id, sender: 'organizador', text } });
  res.status(201).json(message);
}));

// --- Configuración del sitio ---
// Los secretos (clave de comprador, clave Etherscan, URL de planilla) nunca
// se devuelven en texto plano una vez guardados: solo se informa si están
// configurados. Para cambiarlos hay que mandar un valor nuevo.
adminRoutes.get('/site-config', (req, res) => {
  const o = req.organizer;
  res.json({
    siteName: o.siteName,
    hasBuyerPasscode: !!o.buyerPasscodeHash,
    hasSheetUrl: !!o.sheetUrl,
    hasEtherscanKey: !!o.etherscanKey,
  });
});

adminRoutes.put('/site-config', asyncRoute(async (req, res) => {
  const body = req.body || {};
  const data = {};
  if (typeof body.siteName === 'string' && body.siteName.trim()) data.siteName = body.siteName.trim().slice(0, 120);
  if (typeof body.buyerPasscode === 'string') {
    data.buyerPasscodeHash = body.buyerPasscode.trim() ? await hashPassword(body.buyerPasscode.trim()) : null;
  }
  if (typeof body.sheetUrl === 'string') {
    const url = body.sheetUrl.trim();
    if (url && new URL(url).hostname !== 'sheets.googleapis.com') {
      throw new HttpError(400, 'Solo se acepta una URL de sheets.googleapis.com');
    }
    data.sheetUrl = url || null;
  }
  if (typeof body.etherscanKey === 'string') data.etherscanKey = body.etherscanKey.trim() || null;

  const updated = await prisma.organizer.update({ where: { id: req.organizer.id }, data });
  res.json({
    siteName: updated.siteName,
    hasBuyerPasscode: !!updated.buyerPasscodeHash,
    hasSheetUrl: !!updated.sheetUrl,
    hasEtherscanKey: !!updated.etherscanKey,
  });
}));

adminRoutes.post('/test-etherscan', asyncRoute(async (req, res) => {
  if (!req.organizer.etherscanKey) throw new HttpError(400, 'Guardá la clave primero');
  const ethusd = await testEtherscanKey(req.organizer.etherscanKey).catch((err) => {
    throw new HttpError(502, err.message);
  });
  res.json({ ok: true, ethusd: ethusd.ethusd });
}));

adminRoutes.post('/pull-sheet', asyncRoute(async (req, res) => {
  if (!req.organizer.sheetUrl) throw new HttpError(400, 'No hay planilla conectada');
  const parsed = new URL(req.organizer.sheetUrl);
  if (parsed.hostname !== 'sheets.googleapis.com') throw new HttpError(400, 'URL de planilla no permitida');
  const resp = await fetch(parsed.toString());
  const json = await resp.json().catch(() => null);
  if (!resp.ok || (json && json.error)) {
    throw new HttpError(502, (json && json.error && json.error.message) || `Google respondió ${resp.status}`);
  }
  const rows = (json && json.values) || [];
  if (!rows.length) return res.json({ name: '', buyIn: '' });
  const last = rows[rows.length - 1];
  res.json({ name: (last[0] || '').trim(), buyIn: (last[1] || '').trim() });
}));
