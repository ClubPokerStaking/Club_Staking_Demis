import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { api } from '../api.js';
import AdminPanel from '../components/AdminPanel.jsx';

export default function AdminPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState('checking'); // checking | login | ready
  const [siteNameHint, setSiteNameHint] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/o/${slug}`;

  function copyLink() {
    navigator.clipboard?.writeText(publicUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => { checkSession(); }, [slug]);

  async function checkSession() {
    try {
      const me = await api.me();
      if (me.slug === slug) {
        setStatus('ready');
        return;
      }
    } catch { /* no autenticado */ }
    try {
      const site = await api.site(slug);
      setSiteNameHint(site.siteName);
    } catch { /* el sitio puede no existir todavía */ }
    setStatus('login');
  }

  async function submitLogin() {
    setError('');
    try {
      await api.login({ slug, password });
      setStatus('ready');
    } catch (e) {
      setError(e.message);
    }
  }

  async function logout() {
    await api.logout();
    setStatus('login');
    setPassword('');
  }

  if (status === 'checking') {
    return (
      <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center">
        <p className="pk-ivory-dim">Cargando...</p>
      </div>
    );
  }

  if (status === 'login') {
    return (
      <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full pk-surface pk-border border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3"><Lock size={20} className="pk-gold" /><h2 className="pk-display font-semibold text-lg">Panel del organizador</h2></div>
          <p className="pk-ivory-dim text-sm mb-3">{siteNameHint || slug} · ingresá tu contraseña.</p>
          <div className="relative mb-3" style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
              className="w-full pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 pr-10 focus:outline-none"
              placeholder="Contraseña"
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} className="pk-ivory-dim hover:opacity-80">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="pk-brick text-sm mb-2">{error}</p>}
          <button type="button" onClick={submitLogin} className="w-full pk-bg-gold pk-onGold font-medium rounded-lg py-2 hover:opacity-90">Entrar</button>
          <Link to={`/o/${slug}`} className="block text-center text-xs pk-ivory-dim hover:opacity-80 mt-3">Volver al sitio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pk-root pk-bg pk-ivory min-h-screen">
      <header className="pk-border border-b px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Link to={`/o/${slug}`} className="pk-display font-semibold text-lg">← Ver sitio público</Link>
        <button
          type="button"
          onClick={copyLink}
          className="pk-surface2 pk-border border rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs pk-ivory-dim hover:opacity-80"
          title="Copiar el link para tus compradores"
        >
          <span className="pk-mono">{publicUrl}</span>
          {copied ? <Check size={14} className="pk-gold" /> : <Copy size={14} />}
        </button>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <AdminPanel onLogout={logout} />
      </main>
    </div>
  );
}
