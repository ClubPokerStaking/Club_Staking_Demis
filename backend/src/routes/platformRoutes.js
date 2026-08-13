import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prismaClient.js';
import { requirePlatformAdmin } from '../middleware/requirePlatformAdmin.js';
import { HttpError, asyncRoute } from '../httpError.js';

export const platformRoutes = Router();

// Frena intentos de adivinar PLATFORM_ADMIN_SECRET por fuerza bruta.
const platformLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
platformRoutes.use(platformLimiter, requirePlatformAdmin);

platformRoutes.get('/organizers', asyncRoute(async (req, res) => {
  const organizers = await prisma.organizer.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { tournaments: true, packages: true } } },
  });
  res.json(organizers.map((o) => ({
    id: o.id,
    slug: o.slug,
    siteName: o.siteName,
    blocked: o.blocked,
    createdAt: o.createdAt,
    tournamentCount: o._count.tournaments,
    packageCount: o._count.packages,
  })));
}));

async function loadOrganizer(id) {
  const o = await prisma.organizer.findUnique({ where: { id } });
  if (!o) throw new HttpError(404, 'Organizador no encontrado');
  return o;
}

platformRoutes.put('/organizers/:id/block', asyncRoute(async (req, res) => {
  await loadOrganizer(req.params.id);
  const o = await prisma.organizer.update({ where: { id: req.params.id }, data: { blocked: true } });
  res.json({ id: o.id, blocked: o.blocked });
}));

platformRoutes.put('/organizers/:id/unblock', asyncRoute(async (req, res) => {
  await loadOrganizer(req.params.id);
  const o = await prisma.organizer.update({ where: { id: req.params.id }, data: { blocked: false } });
  res.json({ id: o.id, blocked: o.blocked });
}));

platformRoutes.delete('/organizers/:id', asyncRoute(async (req, res) => {
  const o = await loadOrganizer(req.params.id);
  // onDelete: Cascade en el schema se lleva puesto torneos, paquetes,
  // compras y mensajes de este organizador.
  await prisma.organizer.delete({ where: { id: o.id } });
  res.json({ ok: true });
}));
