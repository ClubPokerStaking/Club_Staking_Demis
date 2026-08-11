const secure = process.env.COOKIE_SECURE === 'true';

// En desarrollo, frontend y backend comparten origen gracias al proxy de
// Vite, así que 'lax' alcanza. En producción normalmente van a vivir en
// dominios distintos (ej. tu-app.vercel.app y tu-api.onrender.com) — ahí
// hace falta 'none' para que el navegador mande la cookie en esas
// requests cross-site, y el navegador exige 'Secure' (HTTPS) para
// aceptar 'none'. Por eso este valor depende de COOKIE_SECURE.
const sameSite = secure ? 'none' : 'lax';

export const organizerCookieOptions = {
  httpOnly: true,
  secure,
  sameSite,
  path: '/',
  maxAge: 12 * 60 * 60 * 1000,
};

export function buyerGateCookieOptions(slug) {
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  };
}

export function buyerGateCookieName(slug) {
  return `buyer_gate_${slug}`;
}
