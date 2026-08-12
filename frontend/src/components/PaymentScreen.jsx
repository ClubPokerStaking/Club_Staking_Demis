import { useEffect, useState, useCallback } from 'react';
import { Check, Copy, Clock, ExternalLink, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { fmtUSDT, NETWORKS, minutesLeft, txExplorerUrl } from '../format.js';
import { api } from '../api.js';
import ChatThread from './ChatThread.jsx';

const POLL_MS = 20000;

export default function PaymentScreen({ purchase, onUpdated }) {
  const confirmed = purchase.status === 'confirmado';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(purchase.walletAddress)}`;
  const [minsLeft, setMinsLeft] = useState(minutesLeft(purchase.createdAt));
  const [copiedField, setCopiedField] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  useEffect(() => {
    const i = setInterval(() => setMinsLeft(minutesLeft(purchase.createdAt)), 30000);
    return () => clearInterval(i);
  }, [purchase.createdAt]);

  const runVerify = useCallback(async (silent) => {
    if (!silent) { setVerifying(true); setVerifyMsg(''); }
    try {
      const updated = await api.verifyPurchase(purchase.id, purchase.code);
      onUpdated(updated);
      if (!silent) setVerifyMsg(updated.verified ? '¡Pago confirmado!' : 'Todavía no encontramos el pago. Puede tardar unos minutos en confirmarse en la red.');
    } catch (e) {
      if (!silent) setVerifyMsg(`No se pudo verificar: ${e.message}`);
    } finally {
      if (!silent) setVerifying(false);
    }
  }, [purchase.id, purchase.code, onUpdated]);

  useEffect(() => {
    if (purchase.status !== 'pendiente') return;
    const i = setInterval(() => runVerify(true), POLL_MS);
    return () => clearInterval(i);
  }, [purchase.status, runVerify]);

  function copy(text, field) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1500);
  }

  return (
    <div className="pk-ticket pk-surface pk-border border rounded-2xl p-6 pl-8 flex flex-col gap-4">
      <div className="pk-notch pk-notch-top" />
      <div className="pk-notch pk-notch-bottom" />
      <div className="pk-perforation" />
      {confirmed ? (
        <div className="flex items-center gap-2 pk-gold font-semibold"><ShieldCheck size={20} /> Pago confirmado</div>
      ) : (
        <div className="flex items-center gap-2 pk-straw font-semibold"><Clock size={20} /> Esperando pago</div>
      )}
      <p className="pk-ivory-dim text-sm">{purchase.productName} · {purchase.percent}% de acción</p>
      {purchase.productType === 'package' && purchase.legs && (
        <div className="pk-bg pk-border border rounded-xl p-3 flex flex-col gap-1">
          <p className="text-xs pk-ivory-dim mb-0.5">Incluye:</p>
          {purchase.legs.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-xs pk-mono gap-3">
              <span className="pk-ivory">{l.name}</span>
              <span className="pk-ivory-dim text-right">{fmtUSDT(l.buyInMicro)} USDT · venta {Number(l.markup).toFixed(2)}x</span>
            </div>
          ))}
          {purchase.notes && <p className="text-xs pk-straw pt-1.5 pk-border border-t mt-0.5">{purchase.notes}</p>}
        </div>
      )}

      <div className="flex justify-center py-2">
        <img src={qrUrl} alt="QR de la wallet" className="rounded-lg" style={{ background: 'white', padding: 8, border: '2px solid rgba(212,175,55,0.4)' }} width={180} height={180} />
      </div>

      <div>
        <p className="text-xs pk-ivory-dim mb-1">Enviar a esta dirección ({(NETWORKS[purchase.network] || NETWORKS.trc20).label})</p>
        <div className="flex items-center gap-2 pk-bg pk-border border rounded-lg px-3 py-2">
          <code className="text-sm pk-ivory pk-mono flex-1 break-all">{purchase.walletAddress}</code>
          <button onClick={() => copy(purchase.walletAddress, 'addr')} className="pk-ivory-dim hover:opacity-70 shrink-0">
            {copiedField === 'addr' ? <Check size={16} className="pk-gold" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs pk-ivory-dim mb-1">Monto exacto a enviar (clave para identificar tu pago)</p>
        <div className="flex items-center gap-2 pk-bg pk-border-gold border rounded-lg px-3 py-2">
          <span className="text-lg font-bold pk-gold pk-mono flex-1">{fmtUSDT(purchase.uniqueAmountMicro)} USDT</span>
          <button onClick={() => copy(fmtUSDT(purchase.uniqueAmountMicro), 'amt')} className="pk-ivory-dim hover:opacity-70 shrink-0">
            {copiedField === 'amt' ? <Check size={16} className="pk-gold" /> : <Copy size={16} />}
          </button>
        </div>
        <p className="text-xs pk-ivory-dim mt-1">Enviá el monto con todos los decimales — así lo detectamos automáticamente.</p>
      </div>

      {!confirmed && (
        <>
          <p className="text-xs pk-ivory-dim">Tenés ~{Math.ceil(minsLeft)} min antes de que se libere la reserva.</p>
          <button onClick={() => runVerify(false)} disabled={verifying} className="pk-surface2 pk-ivory rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm hover:opacity-90 disabled:opacity-60">
            {verifying ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Ya envié, verificar pago
          </button>
          {verifyMsg && <p className="text-xs pk-ivory-dim text-center">{verifyMsg}</p>}
          <p className="text-xs pk-ivory-dim text-center opacity-70">Se verifica automáticamente cada 20 segundos mientras estés en esta pantalla.</p>
        </>
      )}

      {confirmed && purchase.txHash && (
        <a href={txExplorerUrl(purchase.network, purchase.txHash)} target="_blank" rel="noreferrer" className="text-xs pk-gold flex items-center gap-1 justify-center hover:underline">
          Ver transacción <ExternalLink size={12} />
        </a>
      )}

      <div className="pk-border border-t pt-3 text-center">
        <p className="text-xs pk-ivory-dim">Tu código de compra (guardalo para consultar el estado más tarde)</p>
        <p className="text-lg pk-mono font-bold tracking-widest pk-ivory">{purchase.code}</p>
      </div>

      <ChatThread
        role="comprador"
        unreadCount={0}
        loadMessages={() => api.messages(purchase.id, purchase.code)}
        sendMessage={(text) => api.sendMessage(purchase.id, purchase.code, text)}
      />
    </div>
  );
}
