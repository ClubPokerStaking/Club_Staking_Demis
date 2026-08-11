import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  throw new Error('JWT_SECRET no está configurado o es demasiado corto. Definilo en backend/.env');
}

const ORGANIZER_TOKEN_TTL = '12h';
const BUYER_GATE_TTL = '12h';

export function signOrganizerToken(organizerId) {
  return jwt.sign({ typ: 'organizer', organizerId }, JWT_SECRET, { expiresIn: ORGANIZER_TOKEN_TTL });
}

export function signBuyerGateToken(slug) {
  return jwt.sign({ typ: 'buyer-gate', slug }, JWT_SECRET, { expiresIn: BUYER_GATE_TTL });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
