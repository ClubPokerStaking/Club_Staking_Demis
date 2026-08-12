import { Trash2, Plus } from 'lucide-react';
import EdgeBadge from './EdgeBadge.jsx';

function legEdgePercent(leg) {
  if (leg.roiEstimado === '' || leg.roiEstimado == null) return null;
  const markup = Number(leg.markup) || 1;
  const markupPercent = (markup - 1) * 100;
  return Math.round((Number(leg.roiEstimado) - markupPercent) * 10) / 10;
}

function emptyLeg() {
  return { name: '', buyIn: '', markup: '1', roiEstimado: '', maxBullets: '1' };
}

export const emptyPackageForm = {
  name: '',
  totalPercent: '100',
  notes: '',
  walletAddress: '',
  walletAddressEvm: '',
  deadline: '',
  legs: [emptyLeg()],
};

export function packageFormToEditState(pkg) {
  return {
    name: pkg.name,
    totalPercent: String(pkg.totalPercent || 100),
    notes: pkg.notes || '',
    walletAddress: pkg.walletAddress,
    walletAddressEvm: pkg.walletAddressEvm || '',
    deadline: pkg.deadline || '',
    legs: pkg.legs.map((l) => ({
      name: l.name,
      buyIn: String(l.buyInMicro / 1_000_000 || ''),
      markup: String(l.markup || 1),
      roiEstimado: l.roiEstimado != null ? String(l.roiEstimado) : '',
      maxBullets: String(l.maxBullets || 1),
    })),
  };
}

const inputCls = 'mt-1 w-full pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 focus:outline-none';
const smallInputCls = 'pk-bg pk-border border pk-ivory rounded-lg px-2 py-1.5 text-sm focus:outline-none';

export default function PackageForm({ form, onChange, editing, onSubmit, onCancel }) {
  function setField(key, value) {
    onChange({ ...form, [key]: value });
  }

  function setLeg(i, key, value) {
    const legs = form.legs.map((l, idx) => (idx === i ? { ...l, [key]: value } : l));
    onChange({ ...form, legs });
  }

  function addLeg() {
    onChange({ ...form, legs: [...form.legs, emptyLeg()] });
  }

  function removeLeg(i) {
    if (form.legs.length <= 1) return;
    onChange({ ...form, legs: form.legs.filter((_, idx) => idx !== i) });
  }

  const pricePerPercent = form.legs.reduce((sum, l) => {
    const buyIn = Number(l.buyIn) || 0;
    const markup = Number(l.markup) || 0;
    return sum + (buyIn * markup) / 100;
  }, 0);
  const totalBuyIn = form.legs.reduce((sum, l) => sum + (Number(l.buyIn) || 0), 0);
  const maxPossible = form.legs.reduce((sum, l) => sum + (Number(l.buyIn) || 0) * (Number(l.maxBullets) || 1), 0);
  const legsWithRoi = form.legs.filter((l) => l.roiEstimado !== '' && l.roiEstimado != null);
  const avgRoi = legsWithRoi.length > 0
    ? legsWithRoi.reduce((sum, l) => sum + (Number(l.roiEstimado) || 0), 0) / legsWithRoi.length
    : null;
  const edges = form.legs.map(legEdgePercent).filter((e) => e != null);
  const avgEdge = edges.length > 0 ? Math.round((edges.reduce((s, e) => s + e, 0) / edges.length) * 10) / 10 : null;

  return (
    <div className="pk-surface pk-border border rounded-2xl p-5 flex flex-col gap-4">
      <p className="pk-display pk-gold font-medium">{editing ? 'Editando paquete' : 'Nuevo paquete'}</p>

      <label className="text-sm pk-ivory-dim">
        Nombre del paquete
        <input placeholder="ej: Paquete Serie Verano" value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} />
      </label>

      <div className="flex flex-col gap-3">
        <p className="text-sm pk-ivory-dim">Torneos incluidos</p>
        {form.legs.map((leg, i) => {
          const edge = legEdgePercent(leg);
          return (
            <div key={i} className="pk-surface2 pk-border border rounded-xl p-3 flex flex-col gap-2">
              <div className="grid gap-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto' }}>
                <input placeholder="ej: Main Event" value={leg.name} onChange={(e) => setLeg(i, 'name', e.target.value)} className={smallInputCls} />
                <input placeholder="Buy-in USDT" type="number" value={leg.buyIn} onChange={(e) => setLeg(i, 'buyIn', e.target.value)} className={smallInputCls} />
                <input placeholder="Markup (venta)" type="number" step="0.01" value={leg.markup} onChange={(e) => setLeg(i, 'markup', e.target.value)} className={smallInputCls} />
                <input placeholder="ROI %" type="number" value={leg.roiEstimado} onChange={(e) => setLeg(i, 'roiEstimado', e.target.value)} className={smallInputCls} />
                <input placeholder="Balas" type="number" min="1" value={leg.maxBullets} onChange={(e) => setLeg(i, 'maxBullets', e.target.value)} className={smallInputCls} />
                <button type="button" onClick={() => removeLeg(i)} disabled={form.legs.length <= 1} className="pk-brick hover:opacity-80 disabled:opacity-30 flex items-center justify-center">
                  <Trash2 size={16} />
                </button>
              </div>
              {edge != null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs pk-ivory-dim">Ventaja para el comprador en esta bala jugada:</span>
                  <EdgeBadge edgePercent={edge} />
                </div>
              )}
            </div>
          );
        })}
        <button type="button" onClick={addLeg} className="text-sm pk-gold hover:underline flex items-center gap-1 self-start">
          <Plus size={14} /> Agregar torneo al paquete
        </button>
      </div>

      {pricePerPercent > 0 && (
        <div className="pk-bg-gold-soft rounded-lg px-3 py-2 flex flex-col gap-1">
          <p className="text-sm pk-gold pk-mono">Precio por 1% del paquete (automático) → {pricePerPercent.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDT</p>
          <p className="text-xs pk-ivory-dim pk-mono">Buy-in combinado: {totalBuyIn.toLocaleString('es-AR', { minimumFractionDigits: 2 })} USDT{avgRoi != null ? ` · ROI promedio del paquete: ${avgRoi.toFixed(1)}%` : ''}</p>
          {avgEdge != null && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs pk-ivory-dim">Ventaja neta promedio para el comprador:</span>
              <EdgeBadge edgePercent={avgEdge} size="lg" />
            </div>
          )}
        </div>
      )}
      {maxPossible > totalBuyIn && (
        <p className="text-xs pk-straw pk-bg-straw-soft rounded-lg px-3 py-2">
          Usando todas las balas de cada torneo incluido, la inversión total posible es {maxPossible.toLocaleString('es-AR', { minimumFractionDigits: 2 })} USDT.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label className="text-sm pk-ivory-dim">
          % total a vender
          <input type="number" value={form.totalPercent} onChange={(e) => setField('totalPercent', e.target.value)} className={inputCls} />
        </label>
        <label className="text-sm pk-ivory-dim">
          Fecha límite (opcional)
          <input placeholder="ej: 15/08" value={form.deadline} onChange={(e) => setField('deadline', e.target.value)} className={inputCls} />
        </label>
      </div>
      <label className="text-sm pk-ivory-dim">
        Condiciones para el comprador (opcional)
        <textarea
          placeholder='ej: "Todo lo que no se juega se devuelve"'
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={2}
          className={inputCls}
          style={{ resize: 'vertical' }}
        />
      </label>
      <label className="text-sm pk-ivory-dim">
        Wallet USDT (TRC20) para recibir
        <input placeholder="T..." value={form.walletAddress} onChange={(e) => setField('walletAddress', e.target.value)} className={`${inputCls} pk-mono`} />
      </label>
      <label className="text-sm pk-ivory-dim">
        Wallet ETH/Polygon (opcional)
        <input placeholder="0x..." value={form.walletAddressEvm} onChange={(e) => setField('walletAddressEvm', e.target.value)} className={`${inputCls} pk-mono`} />
      </label>

      <div className="flex gap-3">
        <button type="button" onClick={onSubmit} className="flex-1 pk-bg-gold pk-onGold font-medium rounded-xl py-2.5 hover:opacity-90">
          {editing ? 'Guardar cambios' : 'Publicar paquete'}
        </button>
        <button type="button" onClick={onCancel} className="pk-ivory-dim hover:opacity-80 pk-border border rounded-xl px-4 py-2.5 text-sm">Cancelar</button>
      </div>
    </div>
  );
}
