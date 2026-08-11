import { verifyToken } from '../auth/jwt.js';

// Si el organizador configuró una clave de acceso para compradores, esta
// función exige una cookie de "unlock" válida y ESPECÍFICA para ese slug
// antes de dejar pasar la request. Si no hay clave configurada, el sitio
// es público y no bloquea nada.
export function buyerGateFor(slug) {
  return function (req, res, next) {
    if (!req.organizerPublic.buyerPasscodeHash) return next();
    const cookieName = `buyer_gate_${slug}`;
    const token = req.cookies?.[cookieName];
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.typ !== 'buyer-gate' || payload.slug !== slug) {
      return res.status(403).json({ error: 'gate_locked' });
    }
    next();
  };
}
