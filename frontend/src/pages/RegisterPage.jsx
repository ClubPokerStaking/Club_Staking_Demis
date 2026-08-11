import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../api.js';

export default function RegisterPage() {
  const [slug, setSlug] = useState('');
  const [siteName, setSiteName] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const cleanSlug = slug.trim().toLowerCase();
      await api.register({ slug: cleanSlug, siteName: siteName.trim(), password, inviteCode: inviteCode.trim() });
      navigate(`/o/${cleanSlug}/admin`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'mt-1 w-full pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 focus:outline-none';

  return (
    <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full pk-surface pk-border border rounded-2xl p-6 flex flex-col gap-4">
        <div className="text-center">
          <Trophy size={24} className="pk-gold mx-auto mb-2" />
          <h1 className="pk-display font-semibold text-lg">Crear mi sitio</h1>
          <p className="pk-ivory-dim text-sm mt-1">Vas a tener tu propia página para vender acción, separada de la de otros organizadores.</p>
        </div>

        <label className="text-sm pk-ivory-dim">
          Código de invitación
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className={`${inputCls} pk-mono`} placeholder="te lo pasa quien administra la plataforma" />
        </label>

        <label className="text-sm pk-ivory-dim">
          Nombre del sitio
          <input value={siteName} onChange={(e) => setSiteName(e.target.value)} className={inputCls} placeholder="ej: La Mesa Poker Staking" />
        </label>

        <label className="text-sm pk-ivory-dim">
          Identificador único (va en tu link)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className={`${inputCls} pk-mono`}
            placeholder="ej: mi-club"
          />
          {slug && <p className="text-xs pk-ivory-dim opacity-70 mt-1">Tu link: /o/{slug}</p>}
        </label>

        <label className="text-sm pk-ivory-dim">
          Contraseña (mínimo 8 caracteres)
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="w-full pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 pr-10 focus:outline-none"
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="pk-ivory-dim hover:opacity-80" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {error && <p className="pk-brick text-sm flex items-center gap-1"><AlertCircle size={16} />{error}</p>}

        <button onClick={submit} disabled={loading} className="pk-bg-gold pk-onGold font-medium rounded-xl py-2.5 hover:opacity-90 disabled:opacity-60">
          {loading ? 'Creando...' : 'Crear y entrar'}
        </button>
        <Link to="/" className="text-center text-sm pk-ivory-dim hover:opacity-80">Volver</Link>
      </div>
    </div>
  );
}
