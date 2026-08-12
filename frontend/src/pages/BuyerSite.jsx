import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Search, Lock, RefreshCw, Loader2, Clock, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { api } from '../api.js';
import { fmtUSDT, LIVE_STATUS_MAP } from '../format.js';
import BuyForm from '../components/BuyForm.jsx';
import PaymentScreen from '../components/PaymentScreen.jsx';
import ChatThread from '../components/ChatThread.jsx';
import EdgeBadge from '../components/EdgeBadge.jsx';

export default function BuyerSite() {
  const { slug } = useParams();
  const [site, setSite] = useState(null);
  const [locked, setLocked] = useState(false);
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [showGateInput, setShowGateInput] = useState(false);

  const [view, setView] = useState('browse');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activePurchase, setActivePurchase] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(undefined);

  useEffect(() => { init(); }, [slug]);

  async function init() {
    try {
      const s = await api.site(slug);
      setSite(s);
      if (s.hasGate) {
        setLocked(true);
        setLoading(false);
      } else {
        await loadListings();
      }
    } catch {
      setSite(null);
      setLoading(false);
    }
  }

  async function loadListings() {
    setLoading(true);
    try {
      const [tournaments, packages] = await Promise.all([api.tournaments(slug), api.packages(slug)]);
      const merged = [
        ...tournaments.map((t) => ({ ...t, kind: 'tournament' })),
        ...packages.map((p) => ({ ...p, kind: 'package' })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setItems(merged);
      setLocked(false);
    } catch (e) {
      if (e.message.includes('403') || e.message === 'gate_locked') setLocked(true);
    } finally {
      setLoading(false);
    }
  }

  async function checkGate() {
    try {
      await api.unlock(slug, gateInput);
      setGateError('');
      await loadListings();
    } catch (e) {
      setGateError(e.message || 'Código incorrecto');
    }
  }

  function openBuy(item) {
    setSelected(item);
    setActivePurchase(null);
    setView('buy');
  }

  async function submitPurchase(payload) {
    const purchase = selected.kind === 'package'
      ? await api.buyPackage(slug, selected.id, payload)
      : await api.buy(slug, selected.id, payload);
    setActivePurchase(purchase);
    loadListings();
  }

  async function doLookup() {
    const found = await api.purchaseByCode(lookupCode.trim());
    setLookupResult(found);
  }

  if (site === null && !loading) {
    return (
      <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center px-6">
        <p className="pk-ivory-dim">No encontramos ese sitio.</p>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="pk-root pk-bg pk-ivory min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full pk-surface pk-border border rounded-2xl p-6 text-center">
          <Trophy size={24} className="pk-gold mx-auto mb-2" />
          <h2 className="pk-display font-semibold text-lg mb-1">{site?.siteName || 'Venta de Acción'}</h2>
          <p className="pk-ivory-dim text-sm mb-4">Ingresá la clave de acceso para ver los torneos.</p>
          <form onSubmit={(e) => { e.preventDefault(); checkGate(); }}>
            <div className="relative mb-3">
              <input
                type={showGateInput ? 'text' : 'password'}
                name="site-passcode"
                autoComplete="current-password"
                value={gateInput}
                onChange={(e) => setGateInput(e.target.value)}
                className="w-full pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 pr-10 text-center focus:outline-none"
                placeholder="Clave de acceso"
              />
              <button
                type="button"
                onClick={() => setShowGateInput((s) => !s)}
                className="pk-ivory-dim hover:opacity-80"
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}
              >
                {showGateInput ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {gateError && <p className="pk-brick text-sm mb-2">{gateError}</p>}
            <button type="submit" className="w-full pk-bg-gold pk-onGold font-medium rounded-lg py-2 hover:opacity-90">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="pk-root pk-bg pk-ivory min-h-screen">
      <header className="pk-border border-b px-6 py-4 flex items-center justify-between" style={{ position: 'sticky', top: 0, background: '#0F1912', zIndex: 10 }}>
        <button onClick={() => setView('browse')} className="pk-display flex items-center gap-2 font-semibold text-lg">
          <Trophy size={20} className="pk-gold" />
          {site?.siteName}
        </button>
        <div className="flex items-center gap-4 text-sm">
          <button onClick={() => { setView('lookup'); setLookupResult(undefined); }} className="pk-ivory-dim hover:opacity-80 flex items-center gap-1">
            <Search size={16} /> <span className="hidden sm:inline">Mi compra</span>
          </button>
          <Link to={`/o/${slug}/admin`} className="pk-ivory-dim hover:opacity-80 flex items-center gap-1">
            <Lock size={16} /> <span className="hidden sm:inline">Organizador</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === 'browse' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="pk-display text-2xl font-semibold">Acción en venta</h1>
              <button onClick={loadListings} className="text-sm pk-ivory-dim hover:opacity-80 flex items-center gap-1">
                <RefreshCw size={16} /> Actualizar
              </button>
            </div>
            {loading ? (
              <div className="pk-ivory-dim flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Cargando...</div>
            ) : items.length === 0 ? (
              <div className="pk-ivory-dim pk-border border border-dashed rounded-2xl p-10 text-center">Todavía no hay nada publicado.</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {items.map((item) => {
                  const soldPct = item.totalPercent > 0 ? ((item.totalPercent - item.availablePercent) / item.totalPercent) * 100 : 0;
                  const live = LIVE_STATUS_MAP[item.liveStatus] || LIVE_STATUS_MAP.registro;
                  const isPackage = item.kind === 'package';
                  const expanded = expandedId === item.id;
                  return (
                    <div key={item.id} className="pk-ticket pk-surface pk-border border rounded-2xl p-5 pl-7 flex flex-col gap-3">
                      <div className="pk-notch pk-notch-top" />
                      <div className="pk-notch pk-notch-bottom" />
                      <div className="pk-perforation" />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="pk-display font-semibold text-lg leading-snug">{item.name}</h3>
                            {isPackage && <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap pk-bg-straw-soft pk-straw">PAQUETE</span>}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${live.cls}`}>{live.label}</span>
                          </div>
                          {item.buyInMicro > 0 && <p className="pk-ivory-dim text-sm pk-mono">Buy-in {fmtUSDT(item.buyInMicro)} USDT{isPackage ? ` (${item.legs.length} torneos)` : ''}</p>}
                          {item.liveNote && <p className="pk-ivory-dim text-xs mt-0.5">{item.liveNote}</p>}
                        </div>
                        <span className="pk-bg-gold-soft pk-gold pk-border-gold border pk-mono text-xs px-2 py-1 rounded-full whitespace-nowrap">
                          {fmtUSDT(item.pricePerPercentMicro)} / 1%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 pk-detail-text pk-ivory-dim pk-mono flex-wrap">
                        {item.markup != null && <span>Markup {Number(item.markup).toFixed(2)}x</span>}
                        {item.maxBullets > 1 && <span>Hasta {item.maxBullets} balas</span>}
                        {item.roiEstimado != null && <span>ROI est. {item.roiEstimado}%</span>}
                        {isPackage && item.avgRoiPercent != null && <span className="pk-gold">ROI est. paquete {item.avgRoiPercent}%</span>}
                        {isPackage && <EdgeBadge edgePercent={item.avgEdgePercent} />}
                      </div>
                      {isPackage && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : item.id)}
                          className="text-xs pk-gold hover:underline flex items-center gap-1 self-start"
                        >
                          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {expanded ? 'Ocultar desglose' : 'Ver qué incluye'}
                        </button>
                      )}
                      {isPackage && expanded && (
                        <div className="pk-bg pk-border border rounded-xl p-3 flex flex-col gap-2">
                          {item.legs.map((l) => (
                            <div key={l.id} className="flex items-center justify-between pk-detail-text pk-mono gap-3 flex-wrap">
                              <span className="pk-ivory">{l.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="pk-ivory-dim text-right">{fmtUSDT(l.buyInMicro)} USDT · venta {Number(l.markup).toFixed(2)}x{l.roiEstimado != null ? ` · ROI ${l.roiEstimado}%` : ''}{l.maxBullets > 1 ? ` · hasta ${l.maxBullets} balas` : ''}</span>
                                <EdgeBadge edgePercent={l.edgePercent} />
                              </div>
                            </div>
                          ))}
                          {item.notes && <p className="text-xs pk-straw pt-1.5 pk-border border-t mt-0.5">{item.notes}</p>}
                        </div>
                      )}
                      {item.deadline && <p className="text-xs pk-ivory-dim flex items-center gap-1"><Clock size={12} /> Cierra: {item.deadline}</p>}
                      <div>
                        <div className="flex justify-between text-xs pk-ivory-dim mb-1 pk-mono">
                          <span>{item.availablePercent.toFixed(2)}% disponible</span>
                          <span>{soldPct.toFixed(0)}% vendido</span>
                        </div>
                        <div className="h-1.5 pk-surface2 rounded-full overflow-hidden">
                          <div className="h-full pk-bg-gold" style={{ width: `${soldPct}%` }} />
                        </div>
                      </div>
                      <button
                        disabled={item.availablePercent <= 0}
                        onClick={() => openBuy(item)}
                        className={`mt-2 font-medium rounded-xl py-2 transition-opacity ${item.availablePercent <= 0 ? 'pk-surface2 pk-ivory-dim' : 'pk-bg-gold pk-onGold hover:opacity-90'}`}
                      >
                        {item.availablePercent <= 0 ? 'Agotado' : isPackage ? 'Comprar paquete' : 'Comprar acción'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'buy' && selected && (
          <div className="max-w-lg mx-auto">
            <button onClick={() => setView('browse')} className="pk-ivory-dim hover:opacity-80 flex items-center gap-1 text-sm mb-4">← Volver</button>
            {!activePurchase ? (
              <BuyForm product={selected} onSubmit={submitPurchase} />
            ) : (
              <PaymentScreen purchase={activePurchase} onUpdated={setActivePurchase} />
            )}
          </div>
        )}

        {view === 'lookup' && (
          <div className="max-w-md mx-auto">
            <h2 className="pk-display text-xl font-semibold mb-4">Consultar mi compra</h2>
            <div className="flex gap-2 mb-4">
              <input
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doLookup()}
                placeholder="Código de compra"
                className="flex-1 pk-surface pk-border border pk-ivory rounded-lg px-3 py-2 uppercase pk-mono focus:outline-none"
              />
              <button onClick={doLookup} className="pk-bg-gold pk-onGold font-medium rounded-lg px-4 hover:opacity-90">Buscar</button>
            </div>
            {lookupResult === null && <p className="pk-ivory-dim text-sm">No encontramos ninguna compra con ese código.</p>}
            {lookupResult && (
              <div className="pk-surface pk-border border rounded-2xl p-5 flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold pk-display">{lookupResult.productName}</p>
                    {(() => {
                      const ls = LIVE_STATUS_MAP[lookupResult.liveStatus] || LIVE_STATUS_MAP.registro;
                      return <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${ls.cls}`}>{ls.label}</span>;
                    })()}
                  </div>
                  <p className="pk-ivory-dim text-sm pk-mono">{lookupResult.percent}% · {fmtUSDT(lookupResult.uniqueAmountMicro)} USDT</p>
                  {lookupResult.productType === 'package' && lookupResult.legs && (
                    <div className="pk-bg pk-border border rounded-xl p-3 mt-2 flex flex-col gap-2">
                      {lookupResult.legs.map((l) => (
                        <div key={l.id} className="flex items-center justify-between pk-detail-text pk-mono gap-3 flex-wrap">
                          <span className="pk-ivory">{l.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="pk-ivory-dim text-right">{fmtUSDT(l.buyInMicro)} USDT · venta {Number(l.markup).toFixed(2)}x</span>
                            <EdgeBadge edgePercent={l.edgePercent} />
                          </div>
                        </div>
                      ))}
                      {lookupResult.notes && <p className="text-xs pk-straw pt-1.5 pk-border border-t mt-0.5">{lookupResult.notes}</p>}
                    </div>
                  )}
                  {lookupResult.liveNote && <p className="pk-ivory-dim text-xs mt-0.5">{lookupResult.liveNote}</p>}
                  <p className={`mt-2 text-sm font-medium ${lookupResult.status === 'confirmado' ? 'pk-gold' : lookupResult.status === 'rechazado' ? 'pk-brick' : 'pk-straw'}`}>
                    Estado del pago: {lookupResult.status}
                  </p>
                </div>
                <ChatThread
                  role="comprador"
                  unreadCount={0}
                  loadMessages={() => api.messages(lookupResult.id, lookupResult.code)}
                  sendMessage={(text) => api.sendMessage(lookupResult.id, lookupResult.code, text)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center text-xs pk-ivory-dim py-6">Pagos verificados automáticamente en la red elegida</footer>
    </div>
  );
}
