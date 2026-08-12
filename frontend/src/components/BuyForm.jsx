import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { fmtUSDT, NETWORKS } from '../format.js';
import EdgeBadge from './EdgeBadge.jsx';

export default function BuyForm({ product, onSubmit }) {
  const [percent, setPercent] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [originWallet, setOriginWallet] = useState('');
  const [network, setNetwork] = useState('trc20');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasEvm = product.hasEvm;
  const isPackage = product.kind === 'package';
  const p = parseFloat(percent) || 0;
  const totalMicro = Math.round(p * product.pricePerPercentMicro);
  const inputCls = 'mt-1 w-full pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 focus:outline-none';

  async function handleSubmit() {
    if (!p || p <= 0) { setError('Ingresá un porcentaje válido'); return; }
    if (p > product.availablePercent + 0.001) { setError(`Solo quedan ${product.availablePercent.toFixed(2)}% disponibles`); return; }
    if (!name.trim() || !contact.trim()) { setError('Completá tu nombre y un contacto'); return; }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ percent: p, buyerName: name.trim(), buyerContact: contact.trim(), originWallet: originWallet.trim(), network });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function onEnter(e) { if (e.key === 'Enter') handleSubmit(); }

  return (
    <div className="pk-surface pk-border border rounded-2xl p-6 flex flex-col gap-4">
      <div>
        <h2 className="pk-display text-xl font-semibold">{product.name}</h2>
        <p className="pk-ivory-dim pk-detail-text pk-mono">Disponible: {product.availablePercent.toFixed(2)}% · {fmtUSDT(product.pricePerPercentMicro)} USDT por 1%{product.markup != null ? ` (markup ${Number(product.markup).toFixed(2)}x)` : ''}</p>
        {isPackage && product.avgRoiPercent != null && (
          <div className="mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="pk-gold font-medium pk-detail-text">ROI estimado del paquete: {product.avgRoiPercent}%</span>
              <EdgeBadge edgePercent={product.avgEdgePercent} size="lg" />
            </div>
            <p className="text-[11px] pk-ivory-dim opacity-70 mt-1">Ventaja estimada sobre el promedio — no incluye el upside de un resultado grande (mesa final, premio mayor).</p>
          </div>
        )}
      </div>
      {isPackage && product.legs && (
        <div className="pk-bg pk-border border rounded-xl p-3 flex flex-col gap-2">
          <p className="pk-ivory-dim pk-detail-label">Este paquete incluye:</p>
          {product.legs.map((l) => (
            <div key={l.id} className="flex items-center justify-between pk-detail-text pk-mono gap-3 flex-wrap">
              <span className="pk-ivory">{l.name}</span>
              <div className="flex items-center gap-2">
                <span className="pk-ivory-dim text-right">{fmtUSDT(l.buyInMicro)} USDT · venta {Number(l.markup).toFixed(2)}x{l.roiEstimado != null ? ` · ROI ${l.roiEstimado}%` : ''}{l.maxBullets > 1 ? ` · hasta ${l.maxBullets} balas` : ''}</span>
                <EdgeBadge edgePercent={l.edgePercent} />
              </div>
            </div>
          ))}
        </div>
      )}
      {isPackage && product.notes && (
        <p className="text-xs pk-straw pk-bg-straw-soft rounded-lg px-3 py-2">{product.notes}</p>
      )}
      {hasEvm && (
        <label className="text-sm pk-ivory-dim">
          Red para pagar
          <select value={network} onChange={(e) => setNetwork(e.target.value)} className={inputCls}>
            <option value="trc20">{NETWORKS.trc20.label}</option>
            <option value="eth">{NETWORKS.eth.label}</option>
            <option value="polygon">{NETWORKS.polygon.label}</option>
          </select>
        </label>
      )}
      <label className="text-sm pk-ivory-dim">
        Porcentaje a comprar
        <input type="number" min="0.1" max={product.availablePercent} step="0.1" value={percent} onChange={(e) => setPercent(e.target.value)} onKeyDown={onEnter} className={inputCls} placeholder="ej: 5" />
      </label>
      {p > 0 && <p className="text-sm pk-ivory-dim">Total a pagar: <span className="pk-gold font-semibold pk-mono">{fmtUSDT(totalMicro)} USDT</span></p>}
      <label className="text-sm pk-ivory-dim">
        Tu nombre
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onEnter} className={inputCls} />
      </label>
      <label className="text-sm pk-ivory-dim">
        Contacto (email o Telegram)
        <input value={contact} onChange={(e) => setContact(e.target.value)} onKeyDown={onEnter} className={inputCls} />
      </label>
      <label className="text-sm pk-ivory-dim">
        Tu wallet de origen (opcional)
        <input value={originWallet} onChange={(e) => setOriginWallet(e.target.value)} onKeyDown={onEnter} className={inputCls} placeholder={`La dirección USDT (${NETWORKS[network].short}) desde la que vas a pagar`} />
      </label>
      {error && <p className="pk-brick text-sm flex items-center gap-1"><AlertCircle size={16} />{error}</p>}
      <button type="button" onClick={handleSubmit} disabled={submitting} className="pk-bg-gold pk-onGold font-medium rounded-xl py-2.5 hover:opacity-90 disabled:opacity-60">
        {submitting ? 'Generando...' : 'Generar orden de pago'}
      </button>
    </div>
  );
}
