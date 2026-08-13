import { verifyToken } from '../auth/jwt.js';
import { prisma } from '../prismaClient.js';

// Toda ruta /api/admin/* pasa por acá. El organizerId sale ÚNICAMENTE del
// JWT firmado por el servidor (cookie httpOnly) — nunca de algo que mande
// el cliente en el body — así una request no puede hacerse pasar por otro
// organizador cambiando un id en el payload.
export async function requireOrganizerAuth(req, res, next) {
  const token = req.cookies?.organizer_session;
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.typ !== 'organizer') {
    return res.status(401).json({ error: 'No autenticado' });
  }
  const organizer = await prisma.organizer.findUnique({ where: { id: payload.organizerId } });
  if (!organizer) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  // Se chequea en cada request (no solo al loguearse) para que un bloqueo
  // corte el acceso de inmediato, aunque la sesión ya estuviera abierta.
  if (organizer.blocked) {
    return res.status(403).json({ error: 'Esta cuenta fue suspendida' });
  }
  req.organizer = organizer;
  next();
}
