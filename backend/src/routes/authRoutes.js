import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prismaClient.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signOrganizerToken } from '../auth/jwt.js';
import { organizerCookieOptions } from '../auth/cookies.js';
import { requireOrganizerAuth } from '../middleware/requireOrganizerAuth.js';

export const authRoutes = Router();

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const RESERVED_SLUGS = new Set(['api', 'admin', 'www', 'static', 'assets']);

// Sin esto, cualquiera podría probar miles de contraseñas por segundo
// contra un slug ajeno.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req.body?.slug || '').toLowerCase()}`,
  message: { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

authRoutes.post('/register', registerLimiter, async (req, res) => {
  const { slug, siteName, password, inviteCode } = req.body || {};

  // Si se configura REGISTRATION_SECRET, nadie puede crear una cuenta de
  // organizador sin conocer ese código — así el registro público queda
  // cerrado por defecto (uso personal) hasta que decidas compartirlo.
  const requiredInvite = process.env.REGISTRATION_SECRET;
  if (requiredInvite && String(inviteCode || '') !== requiredInvite) {
    return res.status(403).json({ error: 'Código de invitación incorrecto' });
  }

  const cleanSlug = String(slug || '').trim().toLowerCase();
  const cleanName = String(siteName || '').trim();

  if (!SLUG_RE.test(cleanSlug) || RESERVED_SLUGS.has(cleanSlug)) {
    return res.status(400).json({ error: 'El identificador debe tener 3-32 caracteres: minúsculas, números y guiones.' });
  }
  if (!cleanName) {
    return res.status(400).json({ error: 'Falta el nombre del sitio' });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const existing = await prisma.organizer.findUnique({ where: { slug: cleanSlug } });
  if (existing) {
    return res.status(409).json({ error: 'Ese identificador ya está en uso, elegí otro.' });
  }

  const organizer = await prisma.organizer.create({
    data: {
      slug: cleanSlug,
      siteName: cleanName,
      passwordHash: await hashPassword(String(password)),
    },
  });

  const token = signOrganizerToken(organizer.id);
  res.cookie('organizer_session', token, organizerCookieOptions);
  res.status(201).json({ slug: organizer.slug, siteName: organizer.siteName });
});

authRoutes.post('/login', loginLimiter, async (req, res) => {
  const { slug, password } = req.body || {};
  const cleanSlug = String(slug || '').trim().toLowerCase();

  const organizer = await prisma.organizer.findUnique({ where: { slug: cleanSlug } });
  const ok = organizer ? await verifyPassword(String(password || ''), organizer.passwordHash) : false;
  if (!ok) {
    return res.status(401).json({ error: 'Identificador o contraseña incorrectos' });
  }
  if (organizer.blocked) {
    return res.status(403).json({ error: 'Esta cuenta fue suspendida' });
  }

  const token = signOrganizerToken(organizer.id);
  res.cookie('organizer_session', token, organizerCookieOptions);
  res.json({ slug: organizer.slug, siteName: organizer.siteName });
});

authRoutes.post('/logout', (req, res) => {
  res.clearCookie('organizer_session', { path: '/' });
  res.json({ ok: true });
});

authRoutes.get('/me', requireOrganizerAuth, (req, res) => {
  res.json({ slug: req.organizer.slug, siteName: req.organizer.siteName });
});
