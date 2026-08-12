import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Award, ExternalLink } from 'lucide-react';
import { api } from '../api.js';

export default function ProfilePage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    api.profile(slug).then(setProfile).catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="pk-ivory-dim mb-3">{error === 'gate_locked' ? 'Este perfil está detrás de la clave de acceso del sitio — entrá primero por el link principal.' : 'No se pudo cargar el perfil.'}</p>
          <Link to={`/o/${slug}`} className="pk-gold hover:underline text-sm">Volver al sitio</Link>
        </div>
      </div>
    );
  }

  if (profile === undefined) {
    return <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center"><p className="pk-ivory-dim">Cargando...</p></div>;
  }

  return (
    <div className="pk-root pk-bg pk-ivory min-h-screen">
      <header className="pk-border border-b px-6 py-4">
        <Link to={`/o/${slug}`} className="pk-display flex items-center gap-2 font-semibold text-lg">
          <Trophy size={20} className="pk-gold" /> {profile.siteName}
        </Link>
      </header>
      <main className="max-w-lg mx-auto px-6 py-10">
        <div className="pk-surface pk-border border rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.siteName} width={72} height={72} style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.4)' }} />
            ) : (
              <div className="pk-bg-gold-soft pk-border-gold border flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: '50%' }}>
                <Trophy size={28} className="pk-gold" />
              </div>
            )}
            <div>
              <h1 className="pk-display text-xl font-semibold">{profile.siteName}</h1>
              {profile.socialLink && (
                <a href={profile.socialLink} target="_blank" rel="noreferrer" className="pk-gold text-sm hover:underline flex items-center gap-1 mt-1">
                  Ver redes <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {profile.bio && <p className="pk-ivory-dim pk-detail-text" style={{ whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}

          {profile.achievements.length > 0 && (
            <div>
              <p className="text-xs pk-ivory-dim mb-2 uppercase" style={{ letterSpacing: '0.08em' }}>Logros</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="flex flex-col gap-2">
                {profile.achievements.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 pk-detail-text">
                    <Award size={14} className="pk-gold" style={{ flexShrink: 0 }} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!profile.bio && profile.achievements.length === 0 && !profile.photoUrl && (
            <p className="pk-ivory-dim text-sm">Este organizador todavía no completó su perfil.</p>
          )}
        </div>
        <Link to={`/o/${slug}`} className="block text-center text-sm pk-ivory-dim hover:opacity-80 mt-4">← Volver al sitio</Link>
      </main>
    </div>
  );
}
