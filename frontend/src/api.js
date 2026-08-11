const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok) {
    throw new Error((data && data.error) || `Error ${res.status}`);
  }
  return data;
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) });
const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body || {}) });
const del = (path) => request(path, { method: 'DELETE' });

export const api = {
  // auth
  register: (data) => post('/auth/register', data),
  login: (data) => post('/auth/login', data),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),

  // público
  site: (slug) => get(`/public/${slug}/site`),
  unlock: (slug, passcode) => post(`/public/${slug}/unlock`, { passcode }),
  tournaments: (slug) => get(`/public/${slug}/tournaments`),
  buy: (slug, tournamentId, payload) => post(`/public/${slug}/tournaments/${tournamentId}/purchase`, payload),
  purchaseByCode: (code) => get(`/public/purchases/by-code/${encodeURIComponent(code)}`),
  verifyPurchase: (id, code) => post(`/public/purchases/${id}/verify`, { code }),
  messages: (id, code) => get(`/public/purchases/${id}/messages?code=${encodeURIComponent(code)}`),
  sendMessage: (id, code, text) => post(`/public/purchases/${id}/messages`, { code, text }),
  networks: () => get('/public/networks'),

  // admin
  adminTournaments: () => get('/admin/tournaments'),
  adminCreateTournament: (data) => post('/admin/tournaments', data),
  adminUpdateTournament: (id, data) => put(`/admin/tournaments/${id}`, data),
  adminToggleClose: (id) => post(`/admin/tournaments/${id}/toggle-close`),
  adminUpdateLiveStatus: (id, data) => put(`/admin/tournaments/${id}/live-status`, data),
  adminDeleteTournament: (id) => del(`/admin/tournaments/${id}`),
  adminPurchases: () => get('/admin/purchases'),
  adminSetPurchaseStatus: (id, status) => put(`/admin/purchases/${id}/status`, { status }),
  adminVerifyPurchase: (id) => post(`/admin/purchases/${id}/verify`),
  adminDeletePurchase: (id) => del(`/admin/purchases/${id}`),
  adminMessages: (id) => get(`/admin/purchases/${id}/messages`),
  adminSendMessage: (id, text) => post(`/admin/purchases/${id}/messages`, { text }),
  adminSiteConfig: () => get('/admin/site-config'),
  adminSaveSiteConfig: (data) => put('/admin/site-config', data),
  adminTestEtherscan: () => post('/admin/test-etherscan'),
  adminPullSheet: () => post('/admin/pull-sheet'),
};
