import { useEffect, useState } from 'react';
import { Trophy, Lock, ShieldOff, ShieldCheck, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../api.js';

const KEY_STORAGE = 'platform_admin_key';

export default function PlatformAdminPage() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [organizers, setOrganizers] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => { if (key) load(key); }, [key]);

  async function load(k) {
    setLoading(true);
    setError('');
    try {
      const data = await api.platformOrganizers(k);
      setOrganizers(data);
    } catch (e) {
      setError(e.message);
      if (e.message.includes('401') || e.message.toLowerCase().includes('incorrecta')) {
        sessionStorage.removeItem(KEY_STORAGE);
        setKey('');
      }
    } finally {
      setLoading(false);
    }
  }

  function tryKey() {
    const k = keyInput.trim();
    if (!k) return;
    sessionStorage.setItem(KEY_STORAGE, k);
    setKey(k);
  }

  async function toggleBlock(o) {
    setBusyId(o.id);
    try {
      if (o.blocked) await api.platformUnblock(key, o.id);
      else await api.platformBlock(key, o.id);
      await load(key);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  }

  async function doDelete(o) {
    if (confirmText.trim() !== o.slug) return;
    setBusyId(o.id);
    try {
      await api.platformDelete(key, o.id);
      setConfirmDeleteId('');
      setConfirmText('');
      await load(key);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  }

  if (!key) {
    return (
      <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full pk-surface pk-border border rounded-2xl p-6 flex flex-col gap-4 text-center">
          <Lock size={24} className="pk-gold mx-auto" />
          <h1 className="pk-display font-semibold text-lg">Panel superadmin</h1>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && tryKey()}
            placeholder="Clave"
            className="pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 pk-mono focus:outline-none text-center"
          />
          <button onClick={tryKey} className="pk-bg-gold pk-onGold font-medium rounded-xl py-2.5 hover:opacity-90">Entrar</button>
          {error && <p className="pk-brick text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="pk-root pk-bg pk-ivory min-h-screen">
      <header className="pk-border border-b px-6 py-4 flex items-center justify-between">
        <div className="pk-display flex items-center gap-2 font-semibold text-lg">
          <Trophy size={20} className="pk-gold" /> Panel superadmin
        </div>
        <button onClick={() => load(key)} className="text-sm pk-ivory-dim hover:opacity-80 flex items-center gap-1">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Actualizar
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-3">
        {error && <p className="pk-brick text-sm pk-bg-brick-soft rounded-lg px-3 py-2">{error}</p>}

        {organizers === null ? (
          <p className="pk-ivory-dim">Cargando...</p>
        ) : organizers.length === 0 ? (
          <p className="pk-ivory-dim">Todavía no hay organizadores registrados.</p>
        ) : (
          organizers.map((o) => (
            <div key={o.id} className="pk-surface pk-border border rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {o.siteName}
                    {o.blocked && <span className="text-xs px-2 py-0.5 rounded-full pk-bg-brick-soft pk-brick">bloqueado</span>}
                  </p>
                  <p className="text-xs pk-ivory-dim pk-mono">/o/{o.slug} · {o.tournamentCount} torneos · {o.packageCount} paquetes · creado {new Date(o.createdAt).toLocaleDateString('es-AR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBlock(o)}
                    disabled={busyId === o.id}
                    className="text-xs pk-border border rounded-lg px-3 py-1.5 flex items-center gap-1 hover:opacity-80 disabled:opacity-50"
                  >
                    {o.blocked ? <ShieldCheck size={14} className="pk-gold" /> : <ShieldOff size={14} className="pk-straw" />}
                    {o.blocked ? 'Desbloquear' : 'Bloquear'}
                  </button>
                  <button
                    onClick={() => { setConfirmDeleteId(o.id); setConfirmText(''); }}
                    disabled={busyId === o.id}
                    className="text-xs pk-brick pk-border border rounded-lg px-3 py-1.5 flex items-center gap-1 hover:opacity-80 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Borrar
                  </button>
                </div>
              </div>
              {confirmDeleteId === o.id && (
                <div className="pk-bg pk-border border-t pt-3 mt-1 flex flex-col gap-2">
                  <p className="text-xs pk-brick">Esto borra la cuenta y TODO lo suyo (torneos, paquetes, compras) para siempre. Escribí <b className="pk-mono">{o.slug}</b> para confirmar:</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="flex-1 pk-bg pk-border border pk-ivory rounded-lg px-3 py-1.5 pk-mono text-sm focus:outline-none"
                    />
                    <button
                      onClick={() => doDelete(o)}
                      disabled={confirmText.trim() !== o.slug || busyId === o.id}
                      className="text-xs pk-bg-brick-soft pk-brick rounded-lg px-3 py-1.5 disabled:opacity-40"
                    >
                      Confirmar borrado
                    </button>
                    <button onClick={() => setConfirmDeleteId('')} className="text-xs pk-ivory-dim hover:opacity-80">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
