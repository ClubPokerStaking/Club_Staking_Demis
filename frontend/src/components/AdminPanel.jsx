import { useEffect, useState } from 'react';
import { Plus, Settings, LogOut, RefreshCw, Loader2, MessageCircle, Trash2, PackagePlus } from 'lucide-react';
import { api } from '../api.js';
import { fmtUSDT } from '../format.js';
import ChatThread from './ChatThread.jsx';
import PackageForm, { emptyPackageForm, packageFormToEditState } from './PackageForm.jsx';

const emptyForm = { name: '', buyIn: '', totalPercent: '100', markup: '1', maxBullets: '1', roiEstimado: '', walletAddress: '', walletAddressEvm: '', deadline: '' };
const inputCls = 'mt-1 w-full pk-bg pk-border border pk-ivory rounded-lg px-3 py-2 focus:outline-none';

export default function AdminPanel({ onLogout }) {
  const [tournaments, setTournaments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [config, setConfig] = useState(null);
  const [toast, setToast] = useState('');
  const [openChatId, setOpenChatId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [showPackageForm, setShowPackageForm] = useState(false);
  const [packageForm, setPackageForm] = useState(emptyPackageForm);
  const [editingPackageId, setEditingPackageId] = useState(null);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // El servidor ya verifica los pagos pendientes en segundo plano cada 30s
  // (sin exponer ninguna clave al navegador). Acá solo refrescamos la
  // lista para reflejar confirmaciones nuevas, sin volver a golpear la
  // API de la blockchain desde cada admin conectado.
  useEffect(() => {
    const i = setInterval(async () => {
      try {
        const fresh = await api.adminPurchases();
        const prevPending = new Set(purchases.filter((p) => p.status === 'pendiente').map((p) => p.id));
        const newlyConfirmed = fresh.find((p) => prevPending.has(p.id) && p.status === 'confirmado');
        if (newlyConfirmed) setToast(`Pago confirmado: ${newlyConfirmed.buyerName} · ${newlyConfirmed.productName}`);
        setPurchases(fresh);
      } catch { /* red caída momentáneamente, se reintenta en el próximo tick */ }
    }, 20000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchases]);

  async function loadAll() {
    const [t, pkgs, p, c] = await Promise.all([api.adminTournaments(), api.adminPackages(), api.adminPurchases(), api.adminSiteConfig()]);
    setTournaments(t);
    setPackages(pkgs);
    setPurchases(p);
    setConfig(c);
  }

  function openNewForm() {
    if (showForm && !editingId) { setShowForm(false); return; }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(t) {
    setForm({
      name: t.name,
      buyIn: String(t.buyInMicro / 1_000_000 || ''),
      totalPercent: String(t.totalPercent || 100),
      markup: String(t.markup || 1),
      maxBullets: String(t.maxBullets || 1),
      roiEstimado: t.roiEstimado != null ? String(t.roiEstimado) : '',
      walletAddress: t.walletAddress,
      walletAddressEvm: t.walletAddressEvm || '',
      deadline: t.deadline || '',
    });
    setEditingId(t.id);
    setShowForm(true);
  }

  function applyTemplate(t) {
    startEdit(t);
    setEditingId(null);
    setToast(`Plantilla aplicada: ${t.name} ✓`);
  }

  function cancelForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmitForm() {
    if (!form.name || !form.buyIn || !form.markup || !form.walletAddress) {
      setToast('Completá nombre, buy-in, markup y wallet');
      return;
    }
    try {
      if (editingId) {
        const updated = await api.adminUpdateTournament(editingId, form);
        setTournaments((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        setToast('Cambios guardados ✓');
      } else {
        const created = await api.adminCreateTournament(form);
        setTournaments((prev) => [created, ...prev]);
        setToast('Torneo publicado ✓');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (e) {
      setToast(e.message);
    }
  }

  async function toggleClose(t) {
    const updated = await api.adminToggleClose(t.id);
    setTournaments((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
  }

  async function updateLiveStatus(t, liveStatus, liveNote) {
    const updated = await api.adminUpdateLiveStatus(t.id, { liveStatus, liveNote });
    setTournaments((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
  }

  async function deleteTournament(t) {
    if (!window.confirm(`¿Borrar "${t.name}" y todas sus compras? No se puede deshacer.`)) return;
    await api.adminDeleteTournament(t.id);
    setTournaments((prev) => prev.filter((x) => x.id !== t.id));
    setPurchases((prev) => prev.filter((x) => x.tournamentId !== t.id));
  }

  function openNewPackageForm() {
    if (showPackageForm && !editingPackageId) { setShowPackageForm(false); return; }
    setPackageForm(emptyPackageForm);
    setEditingPackageId(null);
    setShowPackageForm(true);
  }

  function startEditPackage(pkg) {
    setPackageForm(packageFormToEditState(pkg));
    setEditingPackageId(pkg.id);
    setShowPackageForm(true);
  }

  function cancelPackageForm() {
    setPackageForm(emptyPackageForm);
    setEditingPackageId(null);
    setShowPackageForm(false);
  }

  async function handleSubmitPackageForm() {
    if (!packageForm.name || !packageForm.walletAddress) {
      setToast('Completá nombre y wallet del paquete');
      return;
    }
    if (packageForm.legs.length === 0 || packageForm.legs.some((l) => !l.name || !l.buyIn)) {
      setToast('Cada torneo del paquete necesita nombre y buy-in');
      return;
    }
    try {
      if (editingPackageId) {
        const updated = await api.adminUpdatePackage(editingPackageId, packageForm);
        setPackages((prev) => prev.map((x) => (x.id === editingPackageId ? updated : x)));
        setToast('Cambios guardados ✓');
      } else {
        const created = await api.adminCreatePackage(packageForm);
        setPackages((prev) => [created, ...prev]);
        setToast('Paquete publicado ✓');
      }
      setPackageForm(emptyPackageForm);
      setEditingPackageId(null);
      setShowPackageForm(false);
    } catch (e) {
      setToast(e.message);
    }
  }

  async function togglePackageClose(pkg) {
    const updated = await api.adminTogglePackageClose(pkg.id);
    setPackages((prev) => prev.map((x) => (x.id === pkg.id ? updated : x)));
  }

  async function updatePackageLiveStatus(pkg, liveStatus, liveNote) {
    const updated = await api.adminUpdatePackageLiveStatus(pkg.id, { liveStatus, liveNote });
    setPackages((prev) => prev.map((x) => (x.id === pkg.id ? updated : x)));
  }

  async function deletePackage(pkg) {
    if (!window.confirm(`¿Borrar el paquete "${pkg.name}" y todas sus compras? No se puede deshacer.`)) return;
    await api.adminDeletePackage(pkg.id);
    setPackages((prev) => prev.filter((x) => x.id !== pkg.id));
    setPurchases((prev) => prev.filter((x) => x.productId !== pkg.id));
  }

  async function setPurchaseStatus(p, status) {
    const updated = await api.adminSetPurchaseStatus(p.id, status);
    setPurchases((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
  }

  async function verifyPurchase(p) {
    try {
      const updated = await api.adminVerifyPurchase(p.id);
      setPurchases((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      setToast(updated.verified ? '¡Pago encontrado y confirmado! ✓' : 'Todavía no aparece el pago en la red.');
    } catch (e) {
      setToast(e.message);
    }
  }

  async function deletePurchase(p) {
    if (!window.confirm(`¿Borrar la compra de ${p.buyerName}? No se puede deshacer.`)) return;
    await api.adminDeletePurchase(p.id);
    setPurchases((prev) => prev.filter((x) => x.id !== p.id));
  }

  if (!config) return <p className="pk-ivory-dim">Cargando...</p>;

  const buyInNum = Number(form.buyIn) || 0;
  const markupNum = Number(form.markup) || 0;
  const bulletsNum = Number(form.maxBullets) || 1;
  const computedPrice = buyInNum > 0 && markupNum > 0 ? (buyInNum * markupNum) / 100 : 0;
  const totalPossible = buyInNum > 0 ? buyInNum * bulletsNum : 0;
  const editingHasPurchases = editingId && purchases.some((p) => p.tournamentId === editingId);
  const recentTemplates = (() => {
    const seen = new Set();
    const out = [];
    for (const t of tournaments) {
      if (!seen.has(t.name)) { seen.add(t.name); out.push(t); if (out.length >= 6) break; }
    }
    return out;
  })();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="pk-display text-2xl font-semibold flex items-center gap-2"><Settings size={20} /> Panel del organizador</h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onLogout} className="text-xs pk-ivory-dim hover:opacity-80 flex items-center gap-1"><LogOut size={14} /> Cerrar sesión</button>
          <button type="button" onClick={openNewPackageForm} className="pk-surface2 pk-ivory pk-border border font-medium rounded-xl px-4 py-2 flex items-center gap-1 hover:opacity-80"><PackagePlus size={16} /> Nuevo paquete</button>
          <button type="button" onClick={openNewForm} className="pk-bg-gold pk-onGold font-medium rounded-xl px-4 py-2 flex items-center gap-1 hover:opacity-90"><Plus size={16} /> Nuevo torneo</button>
        </div>
      </div>

      {toast && <div className="pk-bg-gold-soft pk-border-gold border pk-gold text-sm rounded-xl px-4 py-2 text-center">{toast}</div>}

      <SiteConfigSection config={config} onSaved={setConfig} onToast={setToast} />

      {showForm && (
        <div className="pk-surface pk-border border rounded-2xl p-5 grid sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 pk-display pk-gold font-medium">{editingId ? 'Editando torneo' : 'Nuevo torneo'}</p>
          {!editingId && recentTemplates.length > 0 && (
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <span className="text-xs pk-ivory-dim">Recientes:</span>
              {recentTemplates.map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="text-xs pk-surface2 pk-ivory pk-border border rounded-full px-3 py-1 hover:opacity-80">
                  {t.name} · {fmtUSDT(t.buyInMicro)}
                </button>
              ))}
            </div>
          )}
          {config.hasSheetUrl && !editingId && (
            <PullSheetButton onPulled={(row) => setForm((prev) => ({ ...prev, name: row.name || prev.name, buyIn: row.buyIn || prev.buyIn }))} onToast={setToast} onShowForm={() => setShowForm(true)} />
          )}
          {editingHasPurchases && (
            <p className="sm:col-span-2 text-xs pk-straw pk-bg-straw-soft rounded-lg px-3 py-2">Ya hay compras cargadas en este torneo — los cambios de precio solo rigen de acá en adelante.</p>
          )}
          <label className="text-sm pk-ivory-dim sm:col-span-2">
            Nombre del torneo
            <input placeholder="ej: GGMillion" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </label>
          <label className="text-sm pk-ivory-dim">
            Buy-in (USDT)
            <input placeholder="0" type="number" value={form.buyIn} onChange={(e) => setForm({ ...form, buyIn: e.target.value })} className={inputCls} />
          </label>
          <label className="text-sm pk-ivory-dim">
            % total a vender
            <input placeholder="100" type="number" value={form.totalPercent} onChange={(e) => setForm({ ...form, totalPercent: e.target.value })} className={inputCls} />
          </label>
          <label className="text-sm pk-ivory-dim">
            Markup (ej: 1.2 = 20%)
            <input placeholder="1.00" type="number" step="0.01" min="0" value={form.markup} onChange={(e) => setForm({ ...form, markup: e.target.value })} className={inputCls} />
          </label>
          <label className="text-sm pk-ivory-dim">
            Balas / re-entries (máx.)
            <input placeholder="1" type="number" min="1" step="1" value={form.maxBullets} onChange={(e) => setForm({ ...form, maxBullets: e.target.value })} className={inputCls} />
          </label>
          <label className="text-sm pk-ivory-dim">
            ROI estimado % (opcional)
            <input placeholder="ej: 25" type="number" value={form.roiEstimado} onChange={(e) => setForm({ ...form, roiEstimado: e.target.value })} className={inputCls} />
          </label>
          {computedPrice > 0 && (
            <p className="sm:col-span-2 text-sm pk-gold pk-mono pk-bg-gold-soft rounded-lg px-3 py-2">Precio por 1% (automático) → {computedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDT</p>
          )}
          {bulletsNum > 1 && totalPossible > 0 && (
            <p className="sm:col-span-2 text-xs pk-straw pk-bg-straw-soft rounded-lg px-3 py-2">
              Con hasta {bulletsNum} balas, la inversión total posible es {totalPossible.toLocaleString('es-AR', { minimumFractionDigits: 2 })} USDT — el precio por 1% de arriba sigue siendo por entrada.
            </p>
          )}
          <label className="text-sm pk-ivory-dim">
            Fecha límite (opcional)
            <input placeholder="ej: 15/08" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} />
          </label>
          <label className="text-sm pk-ivory-dim">
            Wallet USDT (TRC20) para recibir
            <input placeholder="T..." value={form.walletAddress} onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSubmitForm()} className={`${inputCls} pk-mono`} />
          </label>
          <label className="text-sm pk-ivory-dim">
            Wallet ETH/Polygon (opcional)
            <input placeholder="0x... (misma para las dos redes)" value={form.walletAddressEvm} onChange={(e) => setForm({ ...form, walletAddressEvm: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSubmitForm()} className={`${inputCls} pk-mono`} />
          </label>
          <div className="sm:col-span-2 flex gap-3">
            <button type="button" onClick={handleSubmitForm} className="flex-1 pk-bg-gold pk-onGold font-medium rounded-xl py-2.5 hover:opacity-90">{editingId ? 'Guardar cambios' : 'Publicar torneo'}</button>
            <button type="button" onClick={cancelForm} className="pk-ivory-dim hover:opacity-80 pk-border border rounded-xl px-4 py-2.5 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div>
        <h3 className="pk-display font-semibold mb-3">Tus torneos</h3>
        <div className="flex flex-col gap-2">
          {tournaments.map((t) => (
            <div key={t.id} className="pk-surface pk-border border rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{t.name} <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${t.status === 'activo' ? 'pk-bg-gold-soft pk-gold' : 'pk-surface2 pk-ivory-dim'}`}>{t.status}</span></p>
                  <p className="text-xs pk-ivory-dim pk-mono">{t.availablePercent.toFixed(2)}% disponible de {t.totalPercent}% · markup {Number(t.markup || 1).toFixed(2)}x{t.maxBullets > 1 ? ` · hasta ${t.maxBullets} balas` : ''}{t.roiEstimado != null ? ` · ROI est. ${t.roiEstimado}%` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => startEdit(t)} className="text-xs pk-gold hover:underline pk-border border rounded-lg px-3 py-1.5">Editar</button>
                  <button type="button" onClick={() => toggleClose(t)} className="text-xs pk-ivory-dim hover:opacity-80 pk-border border rounded-lg px-3 py-1.5">{t.status === 'activo' ? 'Cerrar' : 'Reabrir'}</button>
                  <button type="button" onClick={() => deleteTournament(t)} className="text-xs pk-brick hover:underline pk-border border rounded-lg px-3 py-1.5">Borrar</button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap pk-border border-t pt-2.5">
                <select value={t.liveStatus || 'registro'} onChange={(e) => updateLiveStatus(t, e.target.value, t.liveNote || '')} className="pk-bg pk-border border pk-ivory text-xs rounded-lg px-2 py-1 focus:outline-none">
                  <option value="registro">Late Registration</option>
                  <option value="jugando">Jugando</option>
                  <option value="mesa_final">Mesa Final</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <input
                  defaultValue={t.liveNote || ''}
                  onBlur={(e) => e.target.value !== (t.liveNote || '') && updateLiveStatus(t, t.liveStatus || 'registro', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                  placeholder="Nota rápida (ej: 85.000 fichas, Día 2)"
                  className="flex-1 pk-bg pk-border border pk-ivory text-xs rounded-lg px-2 py-1 focus:outline-none"
                  style={{ minWidth: 160 }}
                />
              </div>
            </div>
          ))}
          {tournaments.length === 0 && <p className="pk-ivory-dim text-sm">Todavía no publicaste ningún torneo.</p>}
        </div>
      </div>

      {showPackageForm && (
        <PackageForm
          form={packageForm}
          onChange={setPackageForm}
          editing={!!editingPackageId}
          onSubmit={handleSubmitPackageForm}
          onCancel={cancelPackageForm}
        />
      )}

      <div>
        <h3 className="pk-display font-semibold mb-3">Tus paquetes</h3>
        <div className="flex flex-col gap-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="pk-surface pk-border border rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{pkg.name} <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${pkg.status === 'activo' ? 'pk-bg-gold-soft pk-gold' : 'pk-surface2 pk-ivory-dim'}`}>{pkg.status}</span></p>
                  <p className="text-xs pk-ivory-dim pk-mono">{pkg.availablePercent.toFixed(2)}% disponible de {pkg.totalPercent}% · {pkg.legs.length} torneo{pkg.legs.length !== 1 ? 's' : ''} · {fmtUSDT(pkg.pricePerPercentMicro)} USDT/1%</p>
                  <p className="text-xs pk-ivory-dim opacity-80 mt-1">{pkg.legs.map((l) => l.name).join(' + ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => startEditPackage(pkg)} className="text-xs pk-gold hover:underline pk-border border rounded-lg px-3 py-1.5">Editar</button>
                  <button type="button" onClick={() => togglePackageClose(pkg)} className="text-xs pk-ivory-dim hover:opacity-80 pk-border border rounded-lg px-3 py-1.5">{pkg.status === 'activo' ? 'Cerrar' : 'Reabrir'}</button>
                  <button type="button" onClick={() => deletePackage(pkg)} className="text-xs pk-brick hover:underline pk-border border rounded-lg px-3 py-1.5">Borrar</button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap pk-border border-t pt-2.5">
                <select value={pkg.liveStatus || 'registro'} onChange={(e) => updatePackageLiveStatus(pkg, e.target.value, pkg.liveNote || '')} className="pk-bg pk-border border pk-ivory text-xs rounded-lg px-2 py-1 focus:outline-none">
                  <option value="registro">Late Registration</option>
                  <option value="jugando">Jugando</option>
                  <option value="mesa_final">Mesa Final</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <input
                  defaultValue={pkg.liveNote || ''}
                  onBlur={(e) => e.target.value !== (pkg.liveNote || '') && updatePackageLiveStatus(pkg, pkg.liveStatus || 'registro', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                  placeholder="Nota rápida"
                  className="flex-1 pk-bg pk-border border pk-ivory text-xs rounded-lg px-2 py-1 focus:outline-none"
                  style={{ minWidth: 160 }}
                />
              </div>
            </div>
          ))}
          {packages.length === 0 && <p className="pk-ivory-dim text-sm">Todavía no publicaste ningún paquete.</p>}
        </div>
      </div>

      <div>
        <h3 className="pk-display font-semibold mb-3">Compras</h3>
        <div className="flex flex-col gap-2">
          {purchases.map((p) => (
            <div key={p.id} className="pk-surface pk-border border rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.buyerName} · {p.productName} {p.productType === 'package' && <span className="pk-mono text-[10px] pk-straw">PAQUETE</span>}</p>
                  <p className="text-xs pk-ivory-dim pk-mono">{p.percent}% · {fmtUSDT(p.uniqueAmountMicro)} USDT · {p.buyerContact} · código {p.code}</p>
                  {p.productType === 'package' && p.legs && (
                    <p className="text-xs pk-ivory-dim opacity-70 mt-0.5">Incluye: {p.legs.map((l) => l.name).join(' + ')}</p>
                  )}
                  {p.originWallet && <p className="text-xs pk-ivory-dim opacity-70 truncate pk-mono">Origen: {p.originWallet}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'confirmado' ? 'pk-bg-gold-soft pk-gold' : p.status === 'rechazado' ? 'pk-bg-brick-soft pk-brick' : 'pk-bg-straw-soft pk-straw'}`}>{p.status}</span>
                  {p.status === 'pendiente' && <button type="button" onClick={() => verifyPurchase(p)} className="text-xs pk-ivory-dim hover:opacity-80">Verificar</button>}
                  {p.status !== 'confirmado' && <button type="button" onClick={() => setPurchaseStatus(p, 'confirmado')} className="text-xs pk-gold hover:underline">Confirmar</button>}
                  {p.status !== 'rechazado' && <button type="button" onClick={() => setPurchaseStatus(p, 'rechazado')} className="text-xs pk-brick hover:underline">Rechazar</button>}
                  <button type="button" onClick={() => deletePurchase(p)} className="text-xs pk-brick hover:underline">Borrar</button>
                  <button type="button" onClick={() => setOpenChatId(openChatId === p.id ? null : p.id)} className="text-xs pk-ivory-dim hover:opacity-80 flex items-center gap-1">
                    <MessageCircle size={14} /> Mensajes
                    {p.unreadOrganizer > 0 && <span className="pk-bg-brick-soft pk-brick text-[10px] font-semibold rounded-full px-1.5">{p.unreadOrganizer}</span>}
                  </button>
                </div>
              </div>
              {openChatId === p.id && (
                <ChatThread
                  role="organizador"
                  unreadCount={p.unreadOrganizer}
                  onOpened={() => setPurchases((prev) => prev.map((x) => (x.id === p.id ? { ...x, unreadOrganizer: 0 } : x)))}
                  loadMessages={() => api.adminMessages(p.id)}
                  sendMessage={(text) => api.adminSendMessage(p.id, text)}
                />
              )}
            </div>
          ))}
          {purchases.length === 0 && <p className="pk-ivory-dim text-sm">Todavía no hay compras.</p>}
        </div>
      </div>
    </div>
  );
}

function SiteConfigSection({ config, onSaved, onToast }) {
  const [nameInput, setNameInput] = useState(config.siteName);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [etherscanKeyInput, setEtherscanKeyInput] = useState('');
  const [testingEth, setTestingEth] = useState(false);

  async function save(fields, successMsg) {
    try {
      const updated = await api.adminSaveSiteConfig(fields);
      onSaved(updated);
      onToast(successMsg);
    } catch (e) {
      onToast(e.message);
    }
  }

  async function testEtherscan() {
    setTestingEth(true);
    try {
      const r = await api.adminTestEtherscan();
      onToast(`Conectó bien ✓ (precio ETH: $${r.ethusd})`);
    } catch (e) {
      onToast(`Error real: ${e.message}`);
    } finally {
      setTestingEth(false);
    }
  }

  return (
    <div className="pk-surface pk-border border rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm pk-ivory-dim" style={{ width: 160, flexShrink: 0 }}>Nombre del sitio:</span>
        <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save({ siteName: nameInput }, 'Nombre guardado ✓')} className="pk-bg pk-border border pk-ivory rounded-lg px-2 py-1 text-sm flex-1" style={{ minWidth: 150 }} />
        <button type="button" onClick={() => save({ siteName: nameInput }, 'Nombre guardado ✓')} className="text-sm pk-gold hover:underline">Guardar</button>
      </div>
      <div className="flex items-center gap-3 flex-wrap pk-border border-t pt-3">
        <span className="text-sm pk-ivory-dim" style={{ width: 160, flexShrink: 0 }}>Clave para compradores:</span>
        <input value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} placeholder={config.hasBuyerPasscode ? 'Configurada ✓ (dejar vacío = sin cambios)' : 'vacío = sitio abierto a cualquiera'} className="pk-bg pk-border border pk-ivory rounded-lg px-2 py-1 text-sm flex-1" style={{ minWidth: 150 }} />
        <button type="button" onClick={() => { save({ buyerPasscode: passcodeInput }, passcodeInput.trim() ? 'Clave guardada ✓' : 'Clave desactivada ✓'); setPasscodeInput(''); }} className="text-sm pk-gold hover:underline">Guardar</button>
      </div>
      <div className="flex items-center gap-3 flex-wrap pk-border border-t pt-3">
        <span className="text-sm pk-ivory-dim" style={{ width: 160, flexShrink: 0 }}>Planilla (Google Sheets):</span>
        <input value={sheetUrlInput} onChange={(e) => setSheetUrlInput(e.target.value)} placeholder={config.hasSheetUrl ? 'Configurada ✓ (dejar vacío = sin cambios)' : 'URL de la API de sheets.googleapis.com'} className="pk-bg pk-border border pk-ivory rounded-lg px-2 py-1 text-sm flex-1 pk-mono" style={{ minWidth: 150 }} />
        <button type="button" onClick={() => { save({ sheetUrl: sheetUrlInput }, sheetUrlInput.trim() ? 'Planilla conectada ✓' : 'Sin cambios'); setSheetUrlInput(''); }} className="text-sm pk-gold hover:underline">Guardar</button>
      </div>
      <div className="flex items-center gap-3 flex-wrap pk-border border-t pt-3">
        <span className="text-sm pk-ivory-dim" style={{ width: 160, flexShrink: 0 }}>Clave Etherscan (ETH/Polygon):</span>
        <input value={etherscanKeyInput} onChange={(e) => setEtherscanKeyInput(e.target.value)} placeholder={config.hasEtherscanKey ? 'Configurada ✓ (dejar vacío = sin cambios)' : 'Tu clave de api.etherscan.io'} className="pk-bg pk-border border pk-ivory rounded-lg px-2 py-1 text-sm flex-1 pk-mono" style={{ minWidth: 150 }} />
        <button type="button" onClick={() => { save({ etherscanKey: etherscanKeyInput }, etherscanKeyInput.trim() ? 'Clave guardada ✓' : 'Sin cambios'); setEtherscanKeyInput(''); }} className="text-sm pk-gold hover:underline">Guardar</button>
        {config.hasEtherscanKey && (
          <button type="button" onClick={testEtherscan} disabled={testingEth} className="text-xs pk-bg pk-border-gold border pk-gold rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-60">
            {testingEth ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Probar conexión
          </button>
        )}
      </div>
      <p className="text-xs pk-ivory-dim opacity-70">Por seguridad, estas claves nunca se muestran de nuevo una vez guardadas: solo indicamos si están configuradas.</p>
    </div>
  );
}

function PullSheetButton({ onPulled, onToast, onShowForm }) {
  const [loading, setLoading] = useState(false);
  async function pull() {
    setLoading(true);
    try {
      const row = await api.adminPullSheet();
      if (!row.name) { onToast('No encontré nombre en la última fila'); return; }
      onPulled(row);
      onShowForm();
      onToast(`Traído: ${row.name}${row.buyIn ? ' · ' + row.buyIn : ''} ✓`);
    } catch (e) {
      onToast(`Error real: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" onClick={pull} disabled={loading} className="sm:col-span-2 pk-bg pk-border-gold border pk-gold text-sm rounded-lg py-2 flex items-center justify-center gap-2 disabled:opacity-60">
      {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Traer última fila de mi planilla
    </button>
  );
}
