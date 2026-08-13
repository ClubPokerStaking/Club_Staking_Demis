import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const [slug, setSlug] = useState('');
  const navigate = useNavigate();

  function goToSite() {
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (clean) navigate(`/o/${clean}`);
  }

  return (
    <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full pk-surface pk-border border rounded-2xl p-6 flex flex-col gap-5">
        <div className="text-center">
          <Trophy size={28} className="pk-gold mx-auto mb-2" />
          <h1 className="pk-display font-semibold text-xl">Club Staking</h1>
          <p className="pk-ivory-dim text-sm mt-1">Plataforma para organizadores de torneos que venden % de su acción.</p>
        </div>

        <div className="pk-border border-t pt-4">
          <p className="text-sm pk-ivory-dim mb-2">¿Tenés el link de un organizador? Entrá con su identificador:</p>
          <div className="flex gap-2">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && goToSite()}
              placeholder="ej: mi-club"
              className="flex-1 pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 focus:outline-none pk-mono"
            />
            <button onClick={goToSite} className="pk-bg-gold pk-onGold font-medium rounded-lg px-3 hover:opacity-90 flex items-center">
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="pk-border border-t pt-4 text-center">
          <p className="text-sm pk-ivory-dim mb-2">¿Sos organizador y querés vender acción de tus torneos?</p>
          <Link to="/register" className="pk-bg-gold pk-onGold font-medium rounded-xl py-2.5 px-4 inline-block hover:opacity-90">
            Crear mi sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
