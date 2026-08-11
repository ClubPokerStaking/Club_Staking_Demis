import { useEffect, useState } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';

// role: 'comprador' | 'organizador'
// loadMessages()/sendMessage(text) vienen del padre para no repetir la
// lógica de autenticación (código de compra vs. sesión de admin) acá.
export default function ChatThread({ role, loadMessages, sendMessage, unreadCount, onOpened }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    load();
    onOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      setMessages(await loadMessages());
    } catch {
      // silencioso: el chat no es crítico para el flujo de pago
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(text.trim());
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch {
      // el usuario puede reintentar
    } finally {
      setSending(false);
    }
  }

  function onEnter(e) { if (e.key === 'Enter') send(); }

  return (
    <div className="pk-bg pk-border border rounded-xl p-3 flex flex-col gap-2 text-left">
      <div className="flex items-center justify-between">
        <p className="text-xs pk-ivory-dim font-medium flex items-center gap-1"><MessageCircle size={14} /> Mensajes {unreadCount > 0 && <span className="pk-bg-brick-soft pk-brick text-[10px] font-semibold rounded-full px-1.5">{unreadCount}</span>}</p>
        <button type="button" onClick={load} className="pk-ivory-dim hover:opacity-80"><RefreshCw size={12} /></button>
      </div>
      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
        {loading ? (
          <p className="text-xs pk-ivory-dim opacity-70">Cargando...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs pk-ivory-dim opacity-70">Todavía no hay mensajes.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`text-xs rounded-lg px-2.5 py-1.5 ${m.sender === role ? 'pk-bg-gold-soft pk-gold self-end' : 'pk-surface2 pk-ivory self-start'}`} style={{ maxWidth: '85%' }}>
              {m.text}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onEnter} placeholder="Escribir un mensaje..." className="flex-1 pk-surface pk-border border pk-ivory rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
        <button type="button" onClick={send} disabled={sending || !text.trim()} className="pk-bg-gold pk-onGold text-xs font-medium rounded-lg px-3 disabled:opacity-50">Enviar</button>
      </div>
      <p className="text-[10px] pk-ivory-dim opacity-60">Para compartir una captura, mandala por el contacto que dejaste — acá solo se puede texto.</p>
    </div>
  );
}
